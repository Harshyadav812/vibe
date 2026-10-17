import { Sandbox } from "@e2b/code-interpreter";
import {
  gemini,
  createAgent,
  createTool,
  createNetwork,
  type Tool,
  type Message,
  createState,
} from "@inngest/agent-kit";

import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import z from "zod";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { prisma } from "@/lib/db";

// agent-kit's gemini adapter only reads GEMINI_API_KEY by default; the project
// documents GOOGLE_GENERATIVE_AI_API_KEY, so pass the key explicitly.
const geminiApiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Gemini 3 rejects replayed tool calls that lack a thoughtSignature, but
// agent-kit's gemini adapter drops signatures when parsing responses. Google
// documents this dummy signature for history that can't carry the real one.
// https://ai.google.dev/gemini-api/docs/thought-signatures
const geminiModel = (options: Parameters<typeof gemini>[0]) => {
  const model = gemini({ apiKey: geminiApiKey, ...options });
  const originalOnCall = model.onCall;
  model.onCall = (modelCopy, body) => {
    originalOnCall?.(modelCopy, body);
    for (const content of body.contents ?? []) {
      for (const part of content.parts ?? []) {
        if ("functionCall" in part && !("thoughtSignature" in part)) {
          Object.assign(part, {
            thoughtSignature: "skip_thought_signature_validator",
          });
        }
      }
    }
  };
  return model;
};

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent",
    triggers: [{ event: "code-agent/run" }],
    onFailure: async ({ event, step }) => {
      await step.run("save-failure-message", async () => {
        const projectId = event.data.event.data.projectId;
        if (projectId) {
          await prisma.message.create({
            data: {
              projectId,
              content:
                "Something went wrong after multiple attempts. Please try again.",
              role: "ASSISTANT",
              type: "ERROR",
            },
          });
        }
      });
    },
  },
  async ({ event, step }) => {
    const projectId: string = event.data.projectId;
    try {
    if (!geminiApiKey) {
      throw new Error(
        "Missing Gemini API key: set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY",
      );
    }

    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-nextjs-harsh-812");
      await sandbox.setTimeout(60_000 * 10 * 3);
      return sandbox.sandboxId;
    });

    const previousMessages = await step.run(
      "get-previous-messages",
      async () => {
        const formattedMessages: Message[] = [];

        const messages = await prisma.message.findMany({
          where: {
            projectId: event.data.projectId,
          },
          orderBy: {
            createdAt: "desc", //TODO: make it 'asc' if AI don't understand which one is the last msg
          },
          take: 10,
        });

        for (const message of messages) {
          formattedMessages.push({
            type: "text",
            role: message.role === "ASSISTANT" ? "assistant" : "user",
            content: message.content,
          });
        }

        return formattedMessages.reverse();
      },
    );

    const state = createState<AgentState>(
      {
        summary: "",
        files: {},
      },
      {
        messages: previousMessages,
      },
    );

    const codeAgent = createAgent<AgentState>({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: geminiModel({
        model: "gemini-3.8-flash",
        defaultParameters: {
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },

                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  },
                });
                return result.stdout;
              } catch (e) {
                console.error(
                  `Command failed: ${e} \nstdout: ${buffers.stdout}\nstderror: ${buffers.stderr}`,
                );

                return `Command failed: ${e} \nstdout: ${buffers.stdout}\nstderror: ${buffers.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              }),
            ),
          }),
          handler: async (
            { files },
            { step, network }: Tool.Options<AgentState>,
          ) => {
            const newFiles = await step?.run(
              "createOrUpdateFiles",
              async () => {
                try {
                  const updatedFiles = network.state.data.files || {};
                  const sandbox = await getSandbox(sandboxId);
                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }
                  return updatedFiles;
                } catch (e) {
                  return "Error: " + e;
                }
              },
            );

            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (e) {
                return "Error" + e;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      defaultState: state,
      router: async ({ network }) => {
        const summary = network.state.data.summary;

        if (summary) {
          return;
        }

        return codeAgent;
      },
    });

    const result = await network.run(event.data.value, { state });

    const fragmentTitleGenerator = createAgent({
      name: "fragment-title-generator",
      description: "A fragment title generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: geminiModel({
        model: "gemini-3.5-flash-lite",
        defaultParameters: {
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      }),
    });

    const responseGenerator = createAgent({
      name: "response-generator",
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: geminiModel({
        model: "gemini-3.5-flash-lite",
        defaultParameters: {
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      }),
    });

    const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(
      result.state.data.summary,
    );

    const { output: responseOutput } = await responseGenerator.run(
      result.state.data.summary,
    );

    const generateFragmentTitle = () => {
      if (fragmentTitleOutput[0].type !== "text") {
        return "Fragment";
      }

      if (Array.isArray(fragmentTitleOutput[0].content)) {
        return fragmentTitleOutput[0].content.map((txt) => txt).join("");
      } else {
        return fragmentTitleOutput[0].content;
      }
    };

    const generateResponse = () => {
      if (responseOutput[0].type !== "text") {
        return "Here you go";
      }

      if (Array.isArray(responseOutput[0].content)) {
        return responseOutput[0].content.map((txt) => txt).join("");
      } else {
        return responseOutput[0].content;
      }
    };

    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong, Please try again",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: generateResponse(),
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              title: generateFragmentTitle(),
              files: result.state.data.files,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
    } catch (error) {
      console.error("Code agent function failed:", error);

      // Write an error message to the DB so the frontend stops showing "Generating..."
      await step.run("save-error-on-crash", async () => {
        await prisma.message.create({
          data: {
            projectId,
            content: "Something went wrong. Please try again.",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      });

      throw error; // Re-throw so Inngest marks the function as failed
    }
  },
);
