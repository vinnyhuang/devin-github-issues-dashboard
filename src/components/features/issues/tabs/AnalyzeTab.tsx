import React from "react";
import { Button, StatusBadge, LoadingSpinner } from "@/components/ui";
import { isAnalysisResult, formatTimestamp, isDevinSessionComplete, isDevinSessionRunning } from "@/lib/utils";
import { ISSUE_TYPE_CONFIG, COMPLEXITY_COLORS, getConfidenceLevel } from "@/constants";
import type { GitHubIssue, DatabaseSession, DevinSessionResponse } from "@/lib/types";

interface AnalyzeTabProps {
  issue: GitHubIssue;
  latestAnalysis?: DatabaseSession;
  currentSession?: DevinSessionResponse | null;
  isAnalyzing: boolean;
  analyzingIssueId?: number;
  onAnalyzeIssue: (issue: GitHubIssue) => void;
  onSwitchToResolve?: () => void;
}

export function AnalyzeTab({
  issue,
  latestAnalysis,
  currentSession,
  isAnalyzing,
  analyzingIssueId,
  onAnalyzeIssue,
  onSwitchToResolve
}: AnalyzeTabProps) {
  const hasCurrentRunningSession = currentSession?.status_enum ? isDevinSessionRunning(currentSession.status_enum) : false;
  
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
          <Button
            onClick={() => onAnalyzeIssue(issue)}
            disabled={isAnalyzing}
            isLoading={isAnalyzing && analyzingIssueId === issue.id}
            className="mb-8"
          >
            Analyze Issue
          </Button>
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
          <StatusBadge status="working" />
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <span>Started: {formatTimestamp(new Date())}</span>
        </div>

        <LoadingSpinner 
          size="md" 
          text="Devin is examining the issue and generating insights" 
        />

        {/* Show previous analysis results if available */}
        {latestAnalysis?.result && isDevinSessionComplete(latestAnalysis.status) && isAnalysisResult(latestAnalysis.result) ? (
          <div className="border-t pt-4">
            <h5 className="font-medium text-gray-700 mb-3">Previous Analysis</h5>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
              <p><strong>Type:</strong> {latestAnalysis.result.type}</p>
              <p><strong>Confidence:</strong> {latestAnalysis.result.confidence_score}%</p>
              <p><strong>Strategy:</strong> {latestAnalysis.result.strategy}</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Show completed analysis results
  if (!latestAnalysis) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Latest Analysis</h4>
        <StatusBadge status={latestAnalysis.status} />
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <span>
          {isDevinSessionRunning(latestAnalysis.status)
            ? `Started: ${formatTimestamp(latestAnalysis.createdAt)}`
            : `Completed: ${formatTimestamp(latestAnalysis.createdAt)}`
          }
        </span>
      </div>

      {latestAnalysis.result && isDevinSessionComplete(latestAnalysis.status) && isAnalysisResult(latestAnalysis.result) ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Type</div>
              <div className="flex items-center space-x-2">
                <span>{ISSUE_TYPE_CONFIG[latestAnalysis.result.type]?.icon ?? "📋"}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${ISSUE_TYPE_CONFIG[latestAnalysis.result.type]?.color ?? "bg-gray-100 text-gray-700"}`}>
                  {latestAnalysis.result.type}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Complexity</div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${COMPLEXITY_COLORS[latestAnalysis.result.complexity]}`}>
                {latestAnalysis.result.complexity}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Confidence</div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                getConfidenceLevel(latestAnalysis.result.confidence_score).color === "green" ? "bg-green-100 text-green-700" :
                getConfidenceLevel(latestAnalysis.result.confidence_score).color === "blue" ? "bg-blue-100 text-blue-700" :
                getConfidenceLevel(latestAnalysis.result.confidence_score).color === "yellow" ? "bg-yellow-100 text-yellow-700" :
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
      ) : latestAnalysis.status === "expired" ? (
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

      <div className="pt-4 border-t">
        <div className="flex gap-3">
          <Button
            onClick={() => onAnalyzeIssue(issue)}
            disabled={isAnalyzing}
            isLoading={isAnalyzing && analyzingIssueId === issue.id}
          >
            Re-analyze
          </Button>
          
          {latestAnalysis.result && isDevinSessionComplete(latestAnalysis.status) ? (
            <Button 
              variant="success"
              onClick={onSwitchToResolve}
            >
              Resolve Issue
            </Button>
          ) : null}
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Re-analysis will only run if the issue contents have changed since the last analysis.
        </p>
      </div>
    </div>
  );
}