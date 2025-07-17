# Devin GitHub Issues Dashboard - Claude Code Context

## 📋 Project Overview

This is a take-home assignment for a Solutions Engineering position at Cognition AI (makers of Devin.ai). The goal is to implement a "Devin Automation" that integrates with GitHub Issues using the Devin API.

### Assignment Requirements
- **Primary Task**: Build an automation that integrates Devin with GitHub Issues
- **Deliverables**: Working project + 5-minute Loom video walkthrough
- **Time Constraint**: Focus on getting a single flow working well rather than building a full product
- **Demo Focus**: Show how you would frame the feature to customers

## 🎯 Chosen Project: GitHub Issues Integration

**Core Features Required:**
1. **Issue Dashboard**: Display list of GitHub issues (dashboard or CLI tool)
2. **Issue Analysis**: Trigger Devin session to scope issues and assign confidence scores  
3. **Issue Resolution**: Trigger Devin session to complete tickets with action plans

**Why This Option**: Best demonstrates full Devin workflow (analysis → planning → execution) and shows clear business value for engineering teams.

## 🏗️ Technical Architecture

### Tech Stack (T3 Stack)
- **Framework**: Next.js 14 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **API**: tRPC for type-safe APIs
- **State Management**: React Query (built into tRPC)

### Project Structure
```
devin-github-issues-dashboard/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── IssuesList.tsx   # Display GitHub issues
│   │   ├── AnalysisResults.tsx # Show Devin analysis
│   │   ├── SessionProgress.tsx # Track Devin sessions
│   │   └── Dashboard.tsx    # Main dashboard
│   ├── pages/
│   │   ├── api/
│   │   │   └── trpc/        # tRPC endpoints
│   │   ├── index.tsx        # Main dashboard page
│   │   └── _app.tsx
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   ├── github.ts   # GitHub API operations
│   │   │   │   ├── devin.ts    # Devin API operations
│   │   │   │   └── issues.ts   # Issue management
│   │   │   └── root.ts
│   │   └── db.ts
│   ├── lib/
│   │   ├── github.ts        # GitHub API client
│   │   ├── devin.ts         # Devin API client
│   │   └── types.ts         # TypeScript types
│   └── utils/
├── prisma/
│   └── schema.prisma        # Database schema
└── .env.example             # Environment variables template
```

## 🔧 API Integration Details

### Environment Variables Required
```
GITHUB_TOKEN=your_github_token
DEVIN_API_KEY=your_devin_api_key
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

### GitHub API Integration
- **Endpoint**: GitHub REST API v4
- **Authentication**: GitHub Personal Access Token
- **Key Operations**:
  - List repository issues
  - Get issue details
  - Create pull requests (for Devin's solutions)

### Devin API Integration  
- **Base URL**: https://api.devin.ai/v1
- **Authentication**: Bearer token
- **Key Endpoints**:
  - `POST /sessions` - Create new Devin session
  - `GET /session/{id}` - Get session status
  - `POST /session/{id}/message` - Send messages to session

### Devin API Session Management
```typescript
// Session Creation
{
  "prompt": "Analyze this GitHub issue...",
  "idempotent": true  // Prevents duplicate sessions
}

// Session Status Polling
{
  "session_id": "devin-xxx",
  "status": "running|blocked|stopped",
  "status_enum": "working|blocked|stopped",
  "structured_output": "JSON results when complete"
}
```

## 📊 Database Schema

### Required Tables
```prisma
model Issue {
  id          String   @id @default(cuid())
  githubId    Int      @unique
  title       String
  body        String?
  url         String
  state       String
  labels      Json?    // Array of label objects
  repository  String
  sessions    Session[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Session {
  id              String   @id @default(cuid())
  sessionId       String   @unique  // Devin session ID
  issueId         String
  issue           Issue    @relation(fields: [issueId], references: [id])
  type            String   // 'analysis' or 'resolution'
  status          String   // 'running', 'completed', 'failed'
  result          Json?    // Structured results from Devin
  confidenceScore Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## 🤖 Devin Prompt Engineering

### Analysis Prompt Template
```typescript
function generateAnalysisPrompt(issue: GitHubIssue): string {
  return `
Analyze this GitHub issue and provide a structured assessment:

**Issue Details:**
- Title: ${issue.title}
- Description: ${issue.body}
- Labels: ${issue.labels?.map(l => l.name).join(', ') || 'None'}

**Required Analysis:**
1. Issue Type: Classify as 'bug', 'feature', 'documentation', 'enhancement', or 'question'
2. Complexity: Rate as 'low', 'medium', or 'high'  
3. Confidence Score: Rate from 0-100 how confident you are that you can resolve this
4. Estimated Time: Provide time estimate in minutes
5. Prerequisites: List any requirements or dependencies
6. Resolution Strategy: Brief outline of approach

**Response Format (JSON):**
{
  "type": "bug|feature|documentation|enhancement|question",
  "complexity": "low|medium|high", 
  "confidence_score": 0-100,
  "estimated_time_minutes": number,
  "prerequisites": ["requirement1", "requirement2"],
  "strategy": "Brief description of approach",
  "reasoning": "Explanation of assessment"
}
`;
}
```

### Resolution Prompt Template  
```typescript
function generateResolutionPrompt(issue: GitHubIssue, analysis: any): string {
  return `
Resolve this GitHub issue based on the previous analysis:

**Issue Details:**
- Title: ${issue.title}
- Description: ${issue.body}
- Repository: ${getRepoUrl(issue)}

**Previous Analysis:**
- Type: ${analysis.type}
- Complexity: ${analysis.complexity}
- Strategy: ${analysis.strategy}

**Instructions:**
1. Clone the repository and examine the codebase
2. Implement the solution following the strategy outlined  
3. Write appropriate tests if applicable
4. Create a pull request with:
   - Clear description of changes
   - Reference to original issue (Fixes #${issue.number})
   - Testing instructions

**Quality Requirements:**
- Follow existing code style and patterns
- Add comments for complex logic
- Ensure backwards compatibility
- Test changes before submitting

Please implement the solution and create the pull request.
`;
}
```

## 🎭 Demo Repository: typio-kart

### Repository Details
- **Name**: typio-kart  
- **Description**: A typing game like TypeRacer but with Mario-style powerups that sabotage competitors
- **Current State**: Phase 1 complete (basic typing game)
- **Planned Phases**:
  - Phase 2: WebSocket interactions with other racers
  - Phase 3: Power-up features implementation

### Demo Issues to Create in typio-kart
1. **Simple Bug** (High Confidence): "Typing accuracy calculation shows NaN on empty input"
2. **Feature Request** (Medium Confidence): "Add sound effects for correct/incorrect keystrokes"  
3. **Backend Bug** (Medium Confidence): "Race results API returns 500 when no races exist"
4. **Complex Feature** (Low Confidence): "Implement power-up system with 5 different abilities"
5. **Documentation** (High Confidence): "Add setup instructions to README.md"

### Why typio-kart Works Well for Demo
- **Visual Impact**: Game bugs are immediately obvious
- **Varied Complexity**: From simple calculations to complex game mechanics
- **Engaging**: More interesting than typical CRUD applications
- **Realistic**: Shows how Devin handles both technical and creative challenges

## 🚀 Implementation Priority

### Phase 1: Core Functionality (MVP)
1. **GitHub Integration**: Connect to typio-kart repository, list issues
2. **Basic UI**: Dashboard showing issues with basic details
3. **Devin Analysis**: Send issues to Devin for analysis, display confidence scores
4. **Session Tracking**: Store and display session status

### Phase 2: Enhanced Features  
1. **Issue Resolution**: Trigger Devin to solve issues and create PRs
2. **Batch Processing**: Analyze multiple issues simultaneously
3. **Real-time Updates**: WebSocket or polling for live session progress
4. **Custom Prompts**: Allow customization of analysis/resolution prompts

### Phase 3: Advanced Features
1. **Analytics Dashboard**: Success rates, time tracking, cost analysis
2. **Smart Categorization**: Enhanced AI-powered issue classification  
3. **Repository Health Score**: Overall maintainability metrics

## 🎯 Success Criteria

### Technical Requirements
- ✅ End-to-end issue analysis workflow
- ✅ Successful Devin API integration with error handling
- ✅ Clean, responsive UI using Tailwind/shadcn
- ✅ Type-safe API layer with tRPC
- ✅ Proper database schema and operations

### Demo Requirements
- ✅ 5-minute walkthrough showing business value
- ✅ Live demonstration of issue analysis
- ✅ Show confidence scoring and categorization
- ✅ Demonstrate at least one complete issue resolution
- ✅ Professional presentation suitable for customer demo

### Stretch Goals
- ✅ Batch processing multiple issues
- ✅ Real-time session progress updates
- ✅ Custom prompt templates
- ✅ Analytics and reporting features

## 🔍 Key Integration Points

### tRPC Router Structure
```typescript
// server/api/routers/github.ts
export const githubRouter = createTRPCRouter({
  getIssues: publicProcedure
    .input(z.object({ repo: z.string() }))
    .query(async ({ input }) => {
      // Fetch issues from GitHub API
    }),
});

// server/api/routers/devin.ts  
export const devinRouter = createTRPCRouter({
  analyzeIssue: publicProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Create Devin analysis session
    }),
  
  resolveIssue: publicProcedure
    .input(z.object({ issueId: z.string(), analysisId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Create Devin resolution session
    }),
});
```

## 📝 Implementation Notes

### Error Handling Strategy
- Graceful degradation when APIs are unavailable
- Clear error messages for users
- Retry logic for transient failures
- Fallback data for demo scenarios

### Security Considerations  
- Never expose API keys in client-side code
- Secure credential storage using environment variables
- Rate limiting for API calls
- Input validation and sanitization

### Performance Optimization
- Cache GitHub issue data to reduce API calls
- Implement proper loading states
- Use React Query for efficient data fetching
- Optimize database queries with proper indexing