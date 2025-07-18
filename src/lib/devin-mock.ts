import type { 
  DevinSessionResponse, 
  DevinAnalysisResult, 
  DevinResolutionResult,
  DevinCreateSessionRequest, 
  DevinMessageRequest,
  GitHubIssue,
  DevinStatusEnum,
  DevinMessage
} from "./types";

interface MockSession {
  sessionId: string;
  status: DevinStatusEnum;
  result?: DevinAnalysisResult | DevinResolutionResult;
  startTime: number;
  messages: DevinMessage[];
  processingTimeMs: number;
  type: "analysis" | "resolution"; // Track session type
}

class MockDevinClient {
  private sessions = new Map<string, MockSession>();
  private sessionCounter = 0;

  async createSession(request: DevinCreateSessionRequest): Promise<DevinSessionResponse> {
    await this.simulateDelay(500, 1000); // 0.5-1s delay for API call
    
    const sessionId = `devin-mock-${++this.sessionCounter}-${Date.now()}`;
    
    // Simulate different processing times based on complexity
    const processingTime = this.getProcessingTime(request.prompt);
    
    // Determine session type from prompt
    const sessionType = request.prompt.includes("Analyze this GitHub issue") ? "analysis" : "resolution";
    console.log(`🎭 Mock: Creating ${sessionType} session for ${sessionId}`);
    
    const session: MockSession = {
      sessionId,
      status: "working",
      startTime: Date.now(),
      processingTimeMs: processingTime,
      messages: [],
      type: sessionType,
    };
    
    this.sessions.set(sessionId, session);
    
    // Add initial message
    this.addMessage(sessionId, "user_message", "Session started - analyzing request");
    
    // Schedule progressive messages during processing
    this.scheduleProgressMessages(sessionId, request.prompt, processingTime);
    
    // Schedule completion
    setTimeout(() => {
      this.completeSession(sessionId, request.prompt);
    }, processingTime);
    
    return {
      session_id: sessionId,
      status: "Working on analysis",
      status_enum: "working",
    };
  }

  async getSession(sessionId: string): Promise<DevinSessionResponse> {
    await this.simulateDelay(200, 500); // 0.2-0.5s delay for status check
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const response: DevinSessionResponse = {
      session_id: sessionId,
      status: session.status === "working" ? "Working on analysis" :
              session.status === "blocked" ? "Blocked waiting for input" :
              session.status === "finished" ? "Analysis complete" : session.status,
      status_enum: session.status,
      messages: session.messages,
    };

    if (session.status === "finished") {
      // Generate structured output on-the-fly if session is complete
      if (!session.result) {
        // Determine what type of session this was based on creation
        // For now, we'll check if this was an analysis or resolution based on the session data
        if (session.type === "analysis") {
          session.result = this.generateMockAnalysisResult("Analyze this GitHub issue");
          console.log(`🎭 Mock: Generated analysis result for ${sessionId}`);
        } else if (session.type === "resolution") {
          session.result = this.generateMockResolutionResult("Resolve this GitHub issue");
          console.log(`🎭 Mock: Generated resolution result for ${sessionId}`);
        }
      }
      
      response.structured_output = session.result;
    }

    return response;
  }

  async sendMessage(sessionId: string, _request: DevinMessageRequest): Promise<DevinSessionResponse> {
    await this.simulateDelay(300, 800);
    
    // For now, just return the current session status
    return this.getSession(sessionId);
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
      
      if (session.status === "finished") {
        return session;
      }
      
      if (session.status === "blocked") {
        throw new Error(`Session ${sessionId} is blocked: Mock error for testing`);
      }
      
      await new Promise<void>(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
    
    throw new Error(`Session ${sessionId} timed out after ${maxAttempts} attempts`);
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise<void>(resolve => setTimeout(resolve, delay));
  }

  private getProcessingTime(prompt: string): number {
    // Simulate different processing times based on content
    if (prompt.includes("Analyze this GitHub issue")) {
      // Analysis tasks: 5-15 seconds
      return Math.random() * 10000 + 5000;
    } else if (prompt.includes("Resolve this GitHub issue")) {
      // Resolution tasks: 20-60 seconds
      return Math.random() * 40000 + 20000;
    }
    // Default: 3-8 seconds
    return Math.random() * 5000 + 3000;
  }

  private completeSession(sessionId: string, prompt: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🎭 Mock: Completing session ${sessionId}`);
    session.status = "finished";
    
    if (prompt.includes("Analyze this GitHub issue")) {
      session.result = this.generateMockAnalysisResult(prompt);
      console.log(`✅ Mock: Generated analysis result for ${sessionId}`);
    } else if (prompt.includes("Resolve this GitHub issue")) {
      session.result = this.generateMockResolutionResult(prompt);
      console.log(`✅ Mock: Generated resolution result for ${sessionId}`);
    }
    
    this.sessions.set(sessionId, session);
    console.log(`🎭 Mock: Session ${sessionId} marked as finished with results`);
    
    // Add completion message
    this.addMessage(sessionId, "user_message", "Session completed successfully");
  }

  private generateMockAnalysisResult(prompt: string): DevinAnalysisResult {
    // Extract issue details from prompt for more realistic responses
    const isBug = prompt.toLowerCase().includes("bug") || 
                  prompt.toLowerCase().includes("error") || 
                  prompt.toLowerCase().includes("fix");
    
    const isFeature = prompt.toLowerCase().includes("feature") || 
                     prompt.toLowerCase().includes("add") || 
                     prompt.toLowerCase().includes("implement");
    
    const isDocumentation = prompt.toLowerCase().includes("documentation") || 
                           prompt.toLowerCase().includes("readme") || 
                           prompt.toLowerCase().includes("docs");

    const isMaintenance = prompt.toLowerCase().includes("refactor") || 
                         prompt.toLowerCase().includes("cleanup") || 
                         prompt.toLowerCase().includes("technical debt") ||
                         prompt.toLowerCase().includes("maintenance");

    // Determine type based on content analysis
    let type: DevinAnalysisResult["type"];
    if (isBug) {
      type = "bug";
    } else if (isFeature) {
      type = "feature";
    } else if (isDocumentation) {
      type = "documentation";
    } else if (isMaintenance) {
      type = "maintenance";
    } else {
      type = Math.random() > 0.5 ? "enhancement" : "question";
    }

    // Determine complexity and confidence based on type and keywords
    let complexity: DevinAnalysisResult["complexity"];
    let baseConfidence: number;

    if (type === "documentation") {
      complexity = "low";
      baseConfidence = 85;
    } else if (type === "bug" && prompt.toLowerCase().includes("simple")) {
      complexity = "low";
      baseConfidence = 80;
    } else if (type === "feature" && prompt.toLowerCase().includes("complex")) {
      complexity = "high";
      baseConfidence = 45;
    } else {
      complexity = "medium";
      baseConfidence = 65;
    }

    // Add some randomness to confidence
    const confidence = Math.min(95, Math.max(25, baseConfidence + (Math.random() - 0.5) * 20));

    const strategies = {
      bug: [
        "Identify the root cause through debugging and add proper error handling",
        "Reproduce the issue, fix the underlying logic, and add regression tests",
        "Review the codebase for similar patterns and implement a comprehensive fix"
      ],
      feature: [
        "Design the feature architecture, implement core functionality, and add tests",
        "Break down into smaller components, implement incrementally with proper testing",
        "Research existing patterns, implement following best practices, add documentation"
      ],
      documentation: [
        "Review existing code, write comprehensive documentation with examples",
        "Create step-by-step guides and update relevant README sections",
        "Add inline comments and generate API documentation"
      ],
      enhancement: [
        "Analyze current implementation, optimize performance, and maintain compatibility",
        "Refactor existing code for better maintainability and add improvement tests",
        "Implement enhancement while preserving existing functionality"
      ],
      maintenance: [
        "Refactor code to improve maintainability while preserving functionality",
        "Clean up technical debt and improve code quality with comprehensive testing",
        "Reorganize codebase structure and update dependencies for better performance"
      ],
      question: [
        "Research the codebase to understand the context and provide detailed explanation",
        "Analyze the question scope and provide comprehensive answer with examples",
        "Review documentation and code to give accurate guidance"
      ]
    };


    // Generate scope analysis based on type and complexity
    const generateScopeAnalysis = (type: string, complexity: string) => {
      const baseScope = {
        bug: "Likely affects core logic files and error handling modules",
        feature: "Will require new components, possible database changes, and comprehensive testing",
        documentation: "Mainly affects README, docs folder, and inline code comments",
        enhancement: "Targets specific existing modules with potential cascading effects",
        maintenance: "Code restructuring may affect multiple modules and build processes",
        question: "Investigation may span multiple files to understand current implementation"
      };

      const complexityModifier = {
        low: "Limited to 1-2 files with minimal testing requirements",
        medium: "Affects 3-6 files with moderate integration testing needed",
        high: "Extensive changes across multiple modules requiring comprehensive testing"
      };

      return `${baseScope[type as keyof typeof baseScope] || "Standard development scope"}. ${complexityModifier[complexity as keyof typeof complexityModifier]}.`;
    };

    const strategy = strategies[type][Math.floor(Math.random() * strategies[type].length)]!;
    const scope = generateScopeAnalysis(type, complexity);
    const confidenceScore = Math.round(confidence);
    
    // Generate reasoning in the expected format
    const reasoning = `${confidenceScore > 80 ? 'High' : confidenceScore > 60 ? 'Medium' : 'Low'} confidence (${confidenceScore}) because: 1) The issue is clearly identified with specific symptoms, 2) The fix approach is well-defined and follows established patterns, 3) ${complexity === 'low' ? 'No complex architectural changes needed' : complexity === 'medium' ? 'Moderate changes with manageable complexity' : 'Complex changes requiring careful design'}. ${complexity.charAt(0).toUpperCase() + complexity.slice(1)} complexity because ${complexity === 'low' ? 'it involves straightforward modifications using standard patterns' : complexity === 'medium' ? 'it requires moderate refactoring with some integration considerations' : 'it involves significant architectural changes with multiple integration points'}. ${type === 'bug' ? 'The existing infrastructure supports the fix with minimal risk' : type === 'feature' ? 'New functionality can be added incrementally' : 'Implementation follows established project patterns'}.`;

    return {
      type,
      strategy,
      reasoning,
      complexity,
      scope_analysis: scope,
      confidence_score: confidenceScore
    };
  }

  private generateMockResolutionResult(prompt: string): DevinResolutionResult {
    // Generate realistic mock results for resolution in the expected format
    const summaries = [
      "Successfully implemented continuous timer fix for the typing game. Added useEffect with 100ms setInterval to update game stats when active, ensuring timer updates independently of keypress events. Created comprehensive PR with detailed testing instructions. Implementation follows React best practices and resolves the reported timer synchronization issue.",
      "Fixed the identified bug by implementing proper state management and event handling. Added comprehensive error handling and validation to prevent similar issues. Created detailed PR with step-by-step implementation notes and testing guidelines for reviewers.",
      "Updated component architecture to support real-time updates with proper cleanup mechanisms. Implemented solution using standard React patterns with useEffect and custom hooks. Created PR with comprehensive documentation and backwards compatibility verification.",
      "Completed feature implementation with full test coverage and performance optimization. The solution integrates seamlessly with existing codebase architecture. Created detailed PR with implementation overview and comprehensive testing instructions.",
      "Implemented robust solution addressing the core issue while maintaining code quality standards. Added proper error boundaries and fallback mechanisms. Created comprehensive PR with detailed changelog and migration notes for reviewers."
    ];

    const hasGithubReference = prompt.includes("github.com");
    const prNumber = Math.floor(Math.random() * 999) + 1;

    const pullRequestUrl = `https://github.com/vinnyhuang-devin-test/typio-kart/pull/${prNumber}`;

    return {
      summary: summaries[Math.floor(Math.random() * summaries.length)]!,
      pull_request_url: pullRequestUrl
    };
  }

  private generateAnalysisPrompt(issue: GitHubIssue): string {
    return `Analyze this GitHub issue. You are an expert software engineer analyzing a GitHub issue. Your task is to thoroughly scope this issue, assign a confidence score for how successfully you could resolve it, and provide a structured assessment.

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

Please analyze this issue thoroughly and provide only the structured JSON response with no additional text.`;
  }

  private generateResolutionPrompt(issue: GitHubIssue, analysis: DevinAnalysisResult): string {
    const repoUrl = this.extractRepoUrl(issue.repository_url);
    
    return `Resolve this GitHub issue based on the previous analysis. You are an expert software engineer resolving a GitHub issue. Implement a complete solution based on the previous analysis.

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
- Scope Analysis: ${analysis.scope_analysis ?? "See strategy for implementation details"}

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

  private addMessage(sessionId: string, type: string, message: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.messages.push({
      timestamp: new Date(),
      type,
      message,
    });

    this.sessions.set(sessionId, session);
  }

  private scheduleProgressMessages(sessionId: string, prompt: string, totalTime: number): void {
    const isAnalysis = prompt.includes("Analyze this GitHub issue");
    const isResolution = prompt.includes("Resolve this GitHub issue");

    if (isAnalysis) {
      // Analysis progress messages
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Examining issue details and context"), totalTime * 0.1);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Analyzing code patterns and potential solutions"), totalTime * 0.3);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Calculating confidence score based on complexity"), totalTime * 0.6);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Generating strategy and recommendations"), totalTime * 0.8);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Finalizing analysis results"), totalTime * 0.95);
    } else if (isResolution) {
      // Resolution progress messages
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Setting up development environment"), totalTime * 0.05);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Cloning repository and analyzing codebase"), totalTime * 0.15);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Identifying files and components to modify"), totalTime * 0.25);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Implementing solution based on analysis"), totalTime * 0.45);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Writing tests for the implemented changes"), totalTime * 0.65);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Running tests and verifying solution"), totalTime * 0.8);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Creating pull request with changes"), totalTime * 0.9);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Finalizing documentation and commit message"), totalTime * 0.95);
    } else {
      // Generic progress messages
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Processing request"), totalTime * 0.2);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Analyzing requirements"), totalTime * 0.5);
      setTimeout(() => this.addMessage(sessionId, "devin_message", "Generating response"), totalTime * 0.8);
    }
  }
}

export const mockDevinClient = new MockDevinClient();
export default MockDevinClient;