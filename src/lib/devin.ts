import axios, { type AxiosInstance } from "axios";
import { env } from "@/env";
import type { 
  DevinSessionResponse, 
  DevinAnalysisResult, 
  DevinResolutionResult,
  DevinCreateSessionRequest, 
  DevinMessageRequest,
  GitHubIssue 
} from "./types";

class DevinClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: "https://api.devin.ai/v1",
      headers: {
        "Authorization": `Bearer ${env.DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  async createSession(request: DevinCreateSessionRequest): Promise<DevinSessionResponse> {
    const { data } = await this.api.post<DevinSessionResponse>("/sessions", request);
    return data;
  }

  async getSession(sessionId: string): Promise<DevinSessionResponse> {
    const { data } = await this.api.get<DevinSessionResponse>(`/session/${sessionId}`);
    return data;
  }

  async sendMessage(sessionId: string, request: DevinMessageRequest): Promise<DevinSessionResponse> {
    const { data } = await this.api.post<DevinSessionResponse>(`/session/${sessionId}/message`, request);
    return data;
  }

  async analyzeIssue(issue: GitHubIssue): Promise<string> {
    const prompt = this.generateAnalysisPrompt(issue);
    const session = await this.createSession({
      prompt,
      idempotent: true,
    });
    return session.session_id;
  }

  async resolveIssue(issue: GitHubIssue, analysis: DevinAnalysisResult): Promise<string> {
    const prompt = this.generateResolutionPrompt(issue, analysis);
    const session = await this.createSession({
      prompt,
      idempotent: true,
    });
    return session.session_id;
  }

  async pollSession(sessionId: string, maxAttempts = 60, intervalMs = 5000): Promise<DevinSessionResponse> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const session = await this.getSession(sessionId);
      
      if (session.status_enum === "finished" || session.status_enum === "expired") {
        return session;
      }
      
      if (session.status_enum === "blocked") {
        throw new Error(`Session ${sessionId} is blocked: ${session.error_message ?? "Unknown error"}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
    
    throw new Error(`Session ${sessionId} timed out after ${maxAttempts} attempts`);
  }

  private generateAnalysisPrompt(issue: GitHubIssue): string {
    return `You are an expert software engineer analyzing a GitHub issue. Your task is to thoroughly scope this issue, assign a confidence score for how successfully you could resolve it, and provide a structured assessment.

**Issue Details:**
- Title: ${issue.title}
- Description: ${issue.body ?? "No description provided"}
- Labels: ${issue.labels?.map(l => l.name).join(', ') ?? 'None'}
- Repository: ${issue.repository_url}

**Analysis Requirements:**

1. **Categorization:** Classify the issue type more specifically:
   - **bug**: Something is broken or not working as expected
   - **feature**: New functionality to be added
   - **documentation**: Updates to docs, README, or comments
   - **enhancement**: Improvement to existing functionality
   - **maintenance**: Refactoring, cleanup, technical debt, or code quality improvements
   - **question**: Needs clarification or investigation

2. **Complexity Assessment:** Rate as 'low', 'medium', or 'high' based on:
   - Number of files/components that need modification
   - Technical complexity of the solution
   - Integration requirements with existing systems
   - Testing complexity

3. **Confidence Score (0-100):** How confident are you that you can successfully resolve this issue?
   - 90-100: Very confident - straightforward implementation with clear requirements
   - 70-89: Confident - well-defined but may require some investigation
   - 50-69: Moderately confident - some ambiguity or complexity present
   - 30-49: Low confidence - significant unknowns or complex requirements
   - 0-29: Very low confidence - poorly defined, extremely complex, or missing critical information

4. **Implementation Strategy:** Provide:
   - High-level approach to solving the issue
   - Key implementation steps in order
   - Potential challenges or blockers
   - Clear success criteria

5. **Scope Analysis:** Identify:
   - Which files/directories are likely to be affected
   - Dependencies that might need updates
   - Potential impact on existing functionality
   - Testing requirements (unit, integration, manual)

6. **Reasoning:** Explain your assessment by addressing:
   - What factors contributed to your confidence score?
   - What makes this issue more or less complex than it appears?
   - What assumptions are you making about the codebase/requirements?
   - What could cause this assessment to be wrong?
   - Are there any red flags or positive indicators in the issue description?

**Response Format:**
Please respond with a JSON object containing these fields:
{
  "type": "bug|feature|documentation|enhancement|maintenance|question",
  "complexity": "low|medium|high",
  "confidence_score": 0-100,
  "strategy": "Description of implementation approach",
  "scope_analysis": "Summary of files likely affected, dependencies, impact on functionality, and testing requirements",
  "reasoning": "Explanation of your assessment"
}

**Important Guidelines:**
- Be honest about your confidence level - overestimating leads to failed implementations
- Consider the completeness of the issue description when assigning confidence
- Factor in your current knowledge and capabilities
- If critical information is missing, reflect that in a lower confidence score
- Time estimates should be realistic for a thorough implementation including testing
- Consider the repository context and technology stack when assessing complexity

Please analyze this issue thoroughly. Stop when you have completed the analysis and have enough information to fill out the structured response. Do not under any circumstances move to execute the plan. At that point, respond to me with a message containing only the structured JSON response with no additional text, and then end the session.`;
  }

  private generateResolutionPrompt(issue: GitHubIssue, analysis: DevinAnalysisResult): string {
    const repoUrl = this.extractRepoUrl(issue.repository_url);
    
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
}

Implement the solution step by step, then provide only the structured JSON response.`;
  }

  private extractRepoUrl(repositoryUrl: string): string {
    // Extract owner/repo from repository_url
    const match = /github\.com\/([^\/]+\/[^\/]+)/.exec(repositoryUrl);
    return match ? `https://github.com/${match[1]}` : repositoryUrl;
  }

  isValidAnalysisResult(result: unknown): result is DevinAnalysisResult {
    if (!result || typeof result !== "object") {
      return false;
    }
    
    const r = result as Record<string, unknown>;
    
    return (
      ["bug", "feature", "documentation", "enhancement", "maintenance", "question"].includes(r.type as string) &&
      ["low", "medium", "high"].includes(r.complexity as string) &&
      typeof r.confidence_score === "number" &&
      r.confidence_score >= 0 &&
      r.confidence_score <= 100 &&
      typeof r.strategy === "string" &&
      typeof r.scope_analysis === "string" &&
      typeof r.reasoning === "string"
    );
  }

  isValidResolutionResult(result: unknown): result is DevinResolutionResult {
    if (!result || typeof result !== "object") {
      return false;
    }
    
    const r = result as Record<string, unknown>;
    
    return (
      typeof r.summary === "string" &&
      (r.pull_request_url === undefined || typeof r.pull_request_url === "string")
    );
  }
}

export const devinClient = new DevinClient();
export default DevinClient;