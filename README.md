# Devin GitHub Issues Dashboard

A web dashboard for analyzing and resolving GitHub issues using Devin AI automation. Connect to any GitHub repository, analyze issues with AI-powered insights, and automatically generate solutions with pull requests.

## Key Features

- **Repository Connection**: Connect to any public GitHub repository
- **AI Issue Analysis**: Get automated analysis with confidence scores, complexity ratings, and resolution strategies
- **Real-time Progress**: Watch Devin work with live message streams and status updates
- **Custom Prompts**: Customize resolution prompts for specific requirements
- **Session Management**: Track analysis and resolution sessions with full history
- **Pull Request Integration**: Automatic PR creation with comprehensive descriptions

## Tech Stack

- **Next.js 14** - React framework with TypeScript
- **tRPC** - End-to-end typesafe APIs
- **Prisma** - Database ORM with PostgreSQL
- **Tailwind CSS** - Utility-first CSS framework
- **NextAuth.js** - Authentication (ready for future use)

## Setup Instructions

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- GitHub Personal Access Token
- Devin API key

### 1. Clone and Install

```bash
git clone <repository-url>
cd devin-github-issues-dashboard
pnpm install
```

### 2. Database Setup

Start the database using the provided script:

```bash
./start-database.sh
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/devin-github-issues-dashboard"

# GitHub API - Get from GitHub Settings > Developer settings > Personal access tokens
GITHUB_TOKEN="your_github_personal_access_token"

# Devin API
DEVIN_API_KEY="your_devin_api_key"

# Optional: Enable mock mode for development/testing
USE_MOCK_DEVIN="true"

# Skip env validation for development
SKIP_ENV_VALIDATION=true
```

### 4. Database Migration

Set up the database schema:

```bash
pnpm db:migrate
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the dashboard.

### 6. Production Build

```bash
pnpm build
pnpm start
```

## GitHub Token Permissions

Your GitHub Personal Access Token needs these scopes:
- `repo` - Access to repository data
- `read:user` - Read user profile information

## Usage

1. **Connect Repository**: Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`)
2. **Select Issue**: Click on any issue from the list to view details
3. **Analyze Issue**: Click "Analyze" to get AI-powered insights including type classification, complexity rating, and confidence score
4. **Review Analysis**: View the detailed analysis with resolution strategy and scope assessment
5. **Resolve Issue**: Click "Resolve Issue" to have Devin automatically implement a solution
6. **Monitor Progress**: Watch real-time progress updates and message streams
7. **Review Results**: Access the generated pull request with full implementation details

## Mock Mode

For development and testing, enable mock mode with `USE_MOCK_DEVIN="true"` in your `.env` file. This provides realistic simulated responses without requiring actual Devin API calls.

## Development Commands

```bash
# Start development server
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Database operations
pnpm db:migrate           # Run migrations
pnpm db:studio           # Open database browser
pnpm db:generate         # Regenerate Prisma client
pnpm db:push             # Push schema changes

# Build for production
pnpm build
```