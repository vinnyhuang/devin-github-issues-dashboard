import type { DevinAnalysisResult, DevinResolutionResult, DevinStatusEnum, GitHubIssue } from "@/lib/types";

// Utility function for className concatenation
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Type guard for analysis result
export function isAnalysisResult(result: unknown): result is DevinAnalysisResult {
  if (typeof result !== 'object' || result === null) return false;
  
  const obj = result as Record<string, unknown>;
  return (
    'type' in obj && typeof obj.type === 'string' &&
    'complexity' in obj && typeof obj.complexity === 'string' &&
    'confidence_score' in obj && typeof obj.confidence_score === 'number' &&
    'strategy' in obj && typeof obj.strategy === 'string' &&
    'scope_analysis' in obj && typeof obj.scope_analysis === 'string' &&
    'reasoning' in obj && typeof obj.reasoning === 'string'
  );
}

// Type guard for resolution result
export function isResolutionResult(result: unknown): result is DevinResolutionResult {
  if (typeof result !== 'object' || result === null) return false;
  
  const obj = result as Record<string, unknown>;
  return (
    'summary' in obj && typeof obj.summary === 'string' &&
    (obj.pull_request_url === undefined || typeof obj.pull_request_url === 'string')
  );
}

// Repository URL parsing
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = /github\.com\/([^\/]+)\/([^\/]+)/.exec(url);
  if (!match) return null;
  
  const owner = match[1];
  const repo = match[2]?.replace(/\.git$/, "");
  
  if (!owner || !repo) return null;
  
  return { owner, repo };
}

// Text truncation utility
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// Date formatting utilities
export function formatTimestamp(date: Date | string): string {
  return new Date(date).toLocaleString();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

// Session status helpers (for Devin API status_enum)
export function isDevinSessionRunning(statusEnum: DevinStatusEnum | null | undefined): boolean {
  if (!statusEnum) return false;
  return ["working", "resumed", "suspend_requested", "suspend_requested_frontend", "resume_requested", "resume_requested_frontend"].includes(statusEnum);
}

export function isDevinSessionComplete(statusEnum: DevinStatusEnum | null | undefined): boolean {
  if (!statusEnum) return false;
  return ["finished", "expired", "blocked"].includes(statusEnum);
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// Resolution prompt template generator
export function generateResolutionPromptTemplate(issue: GitHubIssue, analysis: DevinAnalysisResult): string {
  const repoUrl = issue.repository_url || issue.html_url.replace(/\/issues\/\d+$/, '');
  
  return `You are an expert software engineer resolving a GitHub issue. Implement a complete solution based on the previous analysis.

**Issue Details:**
- Title: ${issue.title}
- Description: ${issue.body ?? "No description provided"}
- Repository: ${repoUrl}
- Issue Number: #${issue.number}

**Previous Analysis:**
- Type: ${analysis.type}
- Complexity: ${analysis.complexity}
- Confidence Score: ${analysis.confidence_score}%
- Strategy: ${analysis.strategy}
- Scope Analysis: ${analysis.scope_analysis}

**Implementation Requirements:**

1. **Repository Setup:**
   - Clone the repository and examine the codebase structure
   - Understand existing architecture and identify files from scope analysis
   - Set up development environment as needed

2. **Solution Implementation:**
   - Follow the strategy outlined in the previous analysis
   - Implement changes that address the root cause of the issue
   - Maintain consistency with existing code patterns and style
   - Add appropriate error handling and comments for complex logic

3. **Testing & Quality:**
   - Write tests appropriate for the change (unit, integration, or manual testing)
   - If the codebase has existing tests, ensure they continue to pass
   - For bug fixes, add test cases that would have caught the original issue
   - For new features, include tests that verify the functionality works as expected
   - Test edge cases and potential regression scenarios where applicable
   - Follow existing code style and formatting conventions

4. **Pull Request Creation:**
   - Create descriptive PR title summarizing the change
   - Write comprehensive PR description including:
     - Summary of what was changed and why
     - Reference: "Fixes #${issue.number}"
     - Testing instructions for reviewers
     - Screenshots or demos if applicable (especially for UI changes)

**Success Criteria:**
- The original issue is completely resolved
- All tests pass (existing and new)
- Code follows project conventions and best practices
- PR description clearly explains the solution
- No unrelated changes are included

**Important Guidelines:**
- Focus on solving the specific issue, avoid scope creep
- Prefer simple, straightforward solutions over complex ones
- If you encounter blockers or complexity beyond the analysis, document them clearly
- Test thoroughly - a working fix is better than a fast fix
- Ensure backwards compatibility unless breaking changes are explicitly needed

**Response Format:**
Please respond with a JSON object containing these fields:
{
  "summary": "Concise report of implementation work, challenges encountered, and final outcome",
  "pull_request_url": "https://github.com/owner/repo/pull/123"
}`;
}