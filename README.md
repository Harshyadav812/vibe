# Vibe

Build apps and websites by chatting with AI.

Vibe is an AI-powered code generation platform that lets you create full-stack applications through natural language conversations. Describe what you want to build, and Vibe's AI agent generates working code in isolated sandboxes.

## Features

- AI-powered code generation for complete applications
- Secure code execution in isolated E2B sandboxes
- Project management with version history
- Usage-based pricing with free and pro tiers
- Modern, responsive UI with dark mode support

## Tech Stack

### Core

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 19** - UI library
- **Tailwind CSS v4** - Utility-first styling

### Backend & Database

- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **tRPC** - End-to-end typesafe APIs
- **Zod** - Schema validation

### AI & Code Execution

- **Inngest** - Background job orchestration
- **@inngest/agent-kit** - AI agent framework
- **E2B Code Interpreter** - Secure code sandboxes
- **Google Gemini** - AI model (currently using free tier)

### Authentication & Payments

- **Clerk** - User authentication and management
- **Clerk Pricing Table** - Subscription handling

### UI Components

- **shadcn/ui** - UI component library
- **Radix UI** - Headless UI primitives
- **TanStack Query** - Data fetching and caching
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- API keys for required services

### 1. Clone the Repository

```bash
git clone https://github.com/Harshyadav812/vibe.git
cd vibe
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vibe"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# E2B Sandboxes
E2B_API_KEY=e2b_...

# Inngest
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# Google AI (for Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

### 4. Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 5. Set Up E2B Sandbox Template

E2B sandboxes require a custom template to run the Next.js applications. The template files are already included in `sandbox-templates/nextjs/`.

#### Step 5.1: Install E2B CLI

```bash
# Using npm (globally)
npm install -g @e2b/cli

# Or using npx (no installation needed)
npx @e2b/cli
```

#### Step 5.2: Authenticate with E2B

```bash
e2b auth login
```

This will open a browser window for authentication. Make sure you have an E2B account and API key ready.

#### Step 5.3: Review Template Files

The sandbox template consists of three files in `sandbox-templates/nextjs/`:

1. **e2b.Dockerfile** - Defines the sandbox environment

   - Uses Node.js 21 slim image
   - Installs Next.js 15.5.4
   - Installs shadcn/ui with all components
   - Sets up the working directory

2. **e2b.toml** - Template configuration

   - Contains template name and ID
   - Specifies the start command (`compile_page.sh`)
   - Links to the Dockerfile

3. **compile_page.sh** - Startup script
   - Starts the Next.js dev server with Turbopack
   - Waits for the server to be ready
   - Ensures the home page is compiled

#### Step 5.4: Build the Template

Navigate to the template directory and build:

```bash
cd sandbox-templates/nextjs
e2b template build
```

This process will:

- Build a Docker image from `e2b.Dockerfile`
- Push it to E2B cloud
- Convert it to a micro VM
- Return a template ID (save this!)

The build takes 5-10 minutes on first run.

#### Step 5.5: Update Template ID in Code

After the build completes, you'll see output like:

```
✓ Building sandbox template vibe-nextjs-harsh-812
Template ID: abc123xyz456
```

Copy the template ID and update it in `src/inngest/functions.ts` (around line 28):

```typescript
const sandbox = await Sandbox.create("abc123xyz456"); // Replace with your template ID
```

#### Step 5.6: Verify Template

List your templates to confirm it was created:

```bash
e2b template list
```

You should see your template with the ID you just used.

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Important Notes

### AI Model Configuration

**This version uses Gemini 2.5 Pro (free tier)**, which has limitations and may not consistently generate working projects. For better results, it's **highly recommended** to use **Claude** or other more capable models.

To switch models, modify `src/inngest/functions.ts`:

```typescript
// Replace gemini with your preferred model
import { anthropic } from "@inngest/agent-kit";

// In the agent configuration
model: anthropic({
  model: "claude-3-5-sonnet-20241022",
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

## Common Issues and Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

**Solution**:

- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `createdb vibe`

### Prisma Client Not Found

**Error**: `Cannot find module '@prisma/client'`

**Solution**:

```bash
npm run postinstall
# or
npx prisma generate
```

### E2B Sandbox Errors

**Error**: `Sandbox creation failed`

**Solution**:

- Verify `E2B_API_KEY` is set
- Check template exists: `e2b template list`
- Rebuild template if needed
- Ensure you have E2B credits available

### Clerk Authentication Issues

**Error**: `Clerk: Missing publishable key`

**Solution**:

- Get keys from [Clerk Dashboard](https://dashboard.clerk.com)
- Ensure all Clerk environment variables are set
- Restart dev server after adding keys

### Inngest Function Not Executing

**Error**: Jobs not running or timeout errors

**Solution**:

- Check Inngest Dev Server is running at `http://localhost:8288`
- Verify `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`
- For production, ensure `/api/inngest` is publicly accessible

### Build Errors with Turbopack

**Error**: Build fails with turbopack

**Solution**:

```bash
# Try without turbopack
npm run build -- --no-turbopack
```

### tRPC Middleware Errors

**Error**: `ReferenceError: next is not defined`

**Solution**: This was a syntax error in `src/trpc/init.ts`. Ensure middleware is defined as a function:

```typescript
const isAuthed = t.middleware(async ({ next, ctx }) => {
  // middleware logic
});
```

## Project Structure

```
src/
├── app/              # Next.js app router
├── components/       # Reusable UI components
├── inngest/          # Background jobs and AI agents
├── lib/              # Utility functions
├── modules/          # Feature modules (home, messages, projects)
├── trpc/             # tRPC configuration and routers
└── hooks/            # React hooks
```

## API Keys Setup

1. **Clerk**: [clerk.com](https://clerk.com) - Sign up and create an application
2. **E2B**: [e2b.dev](https://e2b.dev) - Get API key from dashboard
3. **Inngest**: [inngest.com](https://inngest.com) - Create account and get keys
4. **Google AI**: [ai.google.dev](https://ai.google.dev) - Get Gemini API key

## Usage Limits

- **Free Tier**: 5 credits per month
- **Pro Tier**: 100 credits per month

Limits reset every 30 days and are managed via Clerk subscriptions.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is open source and available under the MIT License.
