"use client";

import React, { useState } from "react";
import type { GitHubIssue, DevinSessionResponse } from "@/lib/types";
import { api } from "@/trpc/react";

interface DatabaseSession {
  id: string;
  sessionId: string;
  type: "analysis" | "resolution";
  status: "running" | "completed" | "failed" | "stopped" | "blocked";
  result: unknown;
  createdAt: Date | string;
  issue: {
    githubId: bigint;
  };
}

interface IssueDetailsPanelProps {
  issue: GitHubIssue;
  sessions: DatabaseSession[];
  currentSession?: DevinSessionResponse | null;
  onAnalyzeIssue: (issue: GitHubIssue) => void;
  onSessionUpdate: (session: DevinSessionResponse) => void;
  isAnalyzing: boolean;
  analyzingIssueId?: number;
  onRefreshSessions?: () => void;
}

type TabType = "analyze" | "resolve" | "history";

export function IssueDetailsPanel({
  issue,
  sessions,
  currentSession,
  onAnalyzeIssue,
  onSessionUpdate,
  isAnalyzing,
  analyzingIssueId,
  onRefreshSessions
}: IssueDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("analyze");
  const [customizePrompt, setCustomizePrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // tRPC mutations
  const resolveIssueMutation = api.devin.resolveIssue.useMutation();

  // Get the most recent analysis session
  const latestAnalysis = sessions
    .filter(s => s.type === "analysis")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Get the most recent resolution session
  const latestResolution = sessions
    .filter(s => s.type === "resolution")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Type guard for analysis result (moved up before usage)
  const isAnalysisResult = (result: unknown): result is {
    type: string;
    complexity: string;
    confidence_score: number;
    strategy: string;
    scope_analysis: string;
    reasoning: string;
  } => {
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
  };

  // Type guard for resolution result
  const isResolutionResult = (result: unknown): result is {
    summary: string;
    pull_request_url?: string;
  } => {
    if (typeof result !== 'object' || result === null) return false;
    
    const obj = result as Record<string, unknown>;
    return (
      'summary' in obj && typeof obj.summary === 'string' &&
      (obj.pull_request_url === undefined || typeof obj.pull_request_url === 'string')
    );
  };

  // Check if Resolve tab should be enabled
  const canResolve = latestAnalysis && 
    (latestAnalysis.status === "completed" || latestAnalysis.status === "stopped" || latestAnalysis.status === "blocked") &&
    latestAnalysis.result &&
    isAnalysisResult(latestAnalysis.result);

  // Generate templated resolution prompt
  const generateResolutionPrompt = (analysis: any) => {
    if (!analysis) return "";
    
    return `You are an expert software engineer resolving a GitHub issue. Implement a complete solution based on the previous analysis.

**Issue Details:**
- Title: ${issue.title}
- Description: ${issue.body || "No description provided"}
- Repository: ${issue.repository_url}
- Issue Number: #${issue.number}

**Previous Analysis:**
- Type: ${analysis.type}
- Complexity: ${analysis.complexity}
- Confidence Score: ${analysis.confidence_score}%
- Strategy: ${analysis.strategy}
- Scope Analysis: ${analysis.scope_analysis || "See strategy for implementation details"}

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
  };

  // Initialize custom prompt when customize is enabled
  React.useEffect(() => {
    if (customizePrompt && latestAnalysis?.result && isAnalysisResult(latestAnalysis.result)) {
      setCustomPrompt(generateResolutionPrompt(latestAnalysis.result));
    }
  }, [customizePrompt, latestAnalysis]);

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleStartResolution = async (analysisResult: any) => {
    try {
      setIsResolving(true);
      setErrorMessage(null);
      
      const result = await resolveIssueMutation.mutateAsync({
        sessionId: latestAnalysis.sessionId,
        analysisResult: analysisResult
      });

      if (result.alreadyRunning) {
        setErrorMessage("Resolution is already running for this issue");
        return;
      }

      // Set up session tracking for resolution
      onSessionUpdate({
        session_id: result.sessionId,
        status: "running",
        status_enum: "working",
      });

      // Refresh sessions to show new resolution session
      onRefreshSessions?.();
    } catch (error) {
      console.error("Error starting resolution:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to start resolution";
      setErrorMessage(`Error: ${errorMsg}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleRetryResolution = () => {
    setErrorMessage(null);
    if (latestAnalysis?.result && isAnalysisResult(latestAnalysis.result)) {
      handleStartResolution(latestAnalysis.result);
    }
  };

  // Truncate title if too long
  const truncatedTitle = issue.title.length > 60 
    ? `${issue.title.slice(0, 60)}...` 
    : issue.title;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "stopped":
      case "blocked":
        return "bg-green-100 text-green-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "running":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "stopped":
      case "blocked":
        return "completed";
      default:
        return status;
    }
  };


  const renderAnalyzeTab = () => {
    // Check if there's a current session running for this issue
    const hasCurrentRunningSession = currentSession && currentSession.status === "running";
    
    // If no analysis has been done and no current session, show initial state
    if (!latestAnalysis && !hasCurrentRunningSession) {
      return (
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
            <p>No analysis has been run for this issue yet.</p>
          </div>
          <div className="text-center">
            <button
              onClick={() => onAnalyzeIssue(issue)}
              disabled={isAnalyzing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isAnalyzing && analyzingIssueId === issue.id ? "Analyzing..." : "Analyze Issue"}
            </button>
          </div>
        </div>
      );
    }

    // If there's a current running session, show that status
    if (hasCurrentRunningSession) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Current Analysis</h4>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor("running")}`}>
                running
              </span>
              {onRefreshSessions && (
                <button
                  onClick={() => onRefreshSessions()}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Refresh status"
                >
                  🔄
                </button>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <span>Started: {new Date().toLocaleString()}</span>
          </div>

          <div className="flex items-center space-x-3 py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <div>
              <p className="text-gray-900 font-medium">Analyzing issue...</p>
              <p className="text-gray-600 text-sm">Devin is examining the issue and generating insights</p>
            </div>
          </div>

          {/* Show previous analysis results if available */}
          {latestAnalysis && latestAnalysis.result && (latestAnalysis.status === "completed" || latestAnalysis.status === "stopped" || latestAnalysis.status === "blocked") && isAnalysisResult(latestAnalysis.result) && (
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-700 mb-3">Previous Analysis</h5>
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                <p><strong>Type:</strong> {latestAnalysis.result.type}</p>
                <p><strong>Confidence:</strong> {latestAnalysis.result.confidence_score}%</p>
                <p><strong>Strategy:</strong> {latestAnalysis.result.strategy}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show completed analysis results
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Latest Analysis</h4>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(latestAnalysis.status)}`}>
              {getStatusText(latestAnalysis.status)}
            </span>
            {onRefreshSessions && (
              <button
                onClick={() => onRefreshSessions()}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh status"
              >
                🔄
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <span>
            {latestAnalysis.status === "running" 
              ? `Started: ${new Date(latestAnalysis.createdAt).toLocaleString()}`
              : `Completed: ${new Date(latestAnalysis.createdAt).toLocaleString()}`
            }
          </span>
        </div>

        {latestAnalysis.result && (latestAnalysis.status === "completed" || latestAnalysis.status === "stopped" || latestAnalysis.status === "blocked") && isAnalysisResult(latestAnalysis.result) ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Type</div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  {latestAnalysis.result.type}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Complexity</div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  latestAnalysis.result.complexity === "low" ? "bg-green-100 text-green-700" :
                  latestAnalysis.result.complexity === "medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {latestAnalysis.result.complexity}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">Confidence</div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  latestAnalysis.result.confidence_score >= 80 ? "bg-green-100 text-green-700" :
                  latestAnalysis.result.confidence_score >= 60 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {latestAnalysis.result.confidence_score}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Strategy</div>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {latestAnalysis.result.strategy}
                </p>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Scope Analysis</div>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {latestAnalysis.result.scope_analysis}
                </p>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Reasoning</div>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {latestAnalysis.result.reasoning}
                </p>
              </div>
            </div>

            {latestAnalysis.result.confidence_score < 40 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-yellow-700 text-sm">
                  <strong>Low Confidence:</strong> This issue may require human intervention or additional context.
                </p>
              </div>
            )}
          </div>
        ) : latestAnalysis.status === "failed" ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm mb-2">
                <strong>❌ Analysis Failed:</strong> The analysis session encountered an error and could not complete.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-lg font-medium mb-2">Analysis In Progress</h3>
            <p>Waiting for analysis results...</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => onAnalyzeIssue(issue)}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isAnalyzing && analyzingIssueId === issue.id ? "Re-analyzing..." : "Re-analyze"}
          </button>
          
          {latestAnalysis && latestAnalysis.result && (latestAnalysis.status === "completed" || latestAnalysis.status === "stopped" || latestAnalysis.status === "blocked") ? (
            <button
              onClick={() => setActiveTab("resolve")}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Resolve Issue
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderResolveTab = () => {
    // If no analysis is ready, show disabled state
    if (!canResolve) {
      return (
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="text-lg font-medium mb-2">Analysis Required</h3>
            <p>Complete a successful analysis before resolving this issue.</p>
            {latestAnalysis && latestAnalysis.status === "running" && (
              <p className="text-sm mt-2">Analysis is currently in progress...</p>
            )}
            {latestAnalysis && latestAnalysis.status === "failed" && (
              <p className="text-sm mt-2 text-red-600">Previous analysis failed. Please re-analyze.</p>
            )}
          </div>
        </div>
      );
    }

    // If there's already a resolution session
    if (latestResolution) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Latest Resolution</h4>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(latestResolution.status)}`}>
              {getStatusText(latestResolution.status)}
            </span>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <span>
              {latestResolution.status === "running" 
                ? `Started: ${new Date(latestResolution.createdAt).toLocaleString()}`
                : `Completed: ${new Date(latestResolution.createdAt).toLocaleString()}`
              }
            </span>
          </div>

          {latestResolution.status === "running" ? (
            <div className="flex items-center space-x-3 py-8">
              <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
              <div>
                <p className="text-gray-900 font-medium">Implementing solution...</p>
                <p className="text-gray-600 text-sm">Devin is working on resolving this issue</p>
              </div>
            </div>
          ) : latestResolution.result && (latestResolution.status === "completed" || latestResolution.status === "stopped" || latestResolution.status === "blocked") && isResolutionResult(latestResolution.result) ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Implementation Summary</div>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {latestResolution.result.summary}
                </p>
              </div>
              
              {latestResolution.result.pull_request_url && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Pull Request</div>
                  <div className="bg-gray-50 p-3 rounded">
                    <a 
                      href={latestResolution.result.pull_request_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                    >
                      {latestResolution.result.pull_request_url}
                    </a>
                    <span className="ml-2 text-xs text-gray-500">↗</span>
                  </div>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-green-700 text-sm">
                  <strong>✅ Resolution Complete:</strong> The issue has been successfully resolved and a pull request has been created.
                </p>
              </div>
            </div>
          ) : latestResolution.status === "failed" ? (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm mb-2">
                <strong>❌ Resolution Failed:</strong> The resolution session encountered an error and could not complete.
              </p>
              <button
                onClick={() => handleStartResolution(latestAnalysis.result as any)}
                disabled={isResolving}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
              >
                {isResolving ? "Retrying..." : "Retry Resolution"}
              </button>
            </div>
          ) : null}

          <div className="flex gap-3 pt-4 border-t">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={() => handleStartResolution(latestAnalysis.result as any)}
              disabled={isResolving}
            >
              {isResolving ? "Starting..." : "Re-resolve"}
            </button>
          </div>
        </div>
      );
    }

    // Show staged resolution from analysis
    const analysisResult = latestAnalysis.result as any;
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Resolution Staged from Analysis</h4>
          
          {/* Analysis Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Confidence Score:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  analysisResult.confidence_score >= 80 ? "bg-green-100 text-green-700" :
                  analysisResult.confidence_score >= 60 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {analysisResult.confidence_score}%
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <span className="ml-2 text-sm text-gray-600">{analysisResult.type}</span>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Proposed Strategy:</div>
              <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                {analysisResult.strategy}
              </p>
            </div>
          </div>

          {/* Customize Prompt Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="customizePrompt"
                checked={customizePrompt}
                onChange={(e) => setCustomizePrompt(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="customizePrompt" className="text-sm font-medium text-gray-700">
                Customize Prompt
              </label>
            </div>

            {customizePrompt && (
              <div>
                <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Prompt:
                </label>
                <textarea
                  id="customPrompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="Enter custom resolution prompt..."
                />
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-700 text-sm mb-2">{errorMessage}</p>
                <button
                  onClick={handleRetryResolution}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                disabled={isResolving}
                onClick={() => handleStartResolution(analysisResult)}
              >
                {isResolving ? "Starting Resolution..." : "Start Resolution"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryTab = () => {
    if (sessions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium mb-2">No History</h3>
          <p>No sessions have been run for this issue yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(session.status)}`}>
                  {getStatusText(session.status)}
                </span>
                <span className="text-sm text-gray-600">
                  {session.type === "analysis" ? "Analysis" : "Resolution"}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(session.createdAt).toLocaleString()}
              </span>
            </div>
            
            {session.result && (session.status === "completed" || session.status === "stopped" || session.status === "blocked") ? (
              <div className="mt-2">
                <button
                  onClick={() => toggleSessionExpansion(session.id)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <span className="mr-1">
                    {expandedSessions.has(session.id) ? "▼" : "▶"}
                  </span>
                  {expandedSessions.has(session.id) ? "Hide details" : "See details"}
                </button>
                
                {expandedSessions.has(session.id) && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <div className="text-xs text-gray-500 mb-2 font-medium">Session Result (JSON):</div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto bg-gray-50 p-2 rounded border">
                      {JSON.stringify(session.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Issue #{issue.number}: {truncatedTitle}
        </h2>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            issue.state === "open" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {issue.state}
          </span>
          <span className="text-sm text-gray-600">
            Created by {issue.user.login} on {new Date(issue.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {(["analyze", "resolve", "history"] as TabType[]).map((tab) => {
            const isDisabled = tab === "resolve" && !canResolve;
            
            return (
              <button
                key={tab}
                onClick={() => !isDisabled && setActiveTab(tab)}
                disabled={isDisabled}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : isDisabled
                    ? "border-transparent text-gray-300 cursor-not-allowed"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                title={isDisabled ? "Complete a successful analysis first" : ""}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "analyze" && renderAnalyzeTab()}
      {activeTab === "resolve" && renderResolveTab()}
      {activeTab === "history" && renderHistoryTab()}
    </div>
  );
}