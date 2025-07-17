"use client";

import type { DevinAnalysisResult, DevinSessionResponse } from "@/lib/types";

interface AnalysisResultsProps {
  session: DevinSessionResponse & {
    result?: DevinAnalysisResult;
    confidenceScore?: number;
  };
  onResolveIssue?: (analysisResult: DevinAnalysisResult) => void;
  isResolving?: boolean;
}

export function AnalysisResults({ 
  session, 
  onResolveIssue, 
  isResolving = false 
}: AnalysisResultsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-blue-600 bg-blue-100";
      case "stopped":
      case "completed":
        return "text-green-600 bg-green-100";
      case "blocked":
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    if (score >= 40) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bug":
        return "text-red-600 bg-red-100";
      case "feature":
        return "text-blue-600 bg-blue-100";
      case "enhancement":
        return "text-purple-600 bg-purple-100";
      case "documentation":
        return "text-gray-600 bg-gray-100";
      case "question":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Analysis Results</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
          {session.status}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        <strong>Session ID:</strong> {session.session_id}
      </div>

      {session.status === "running" && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">Devin is analyzing the issue...</span>
        </div>
      )}

      {session.status === "blocked" && session.error_message && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700">
            <strong>Error:</strong> {session.error_message}
          </p>
        </div>
      )}

      {session.result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Type</div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(session.result.type)}`}>
                {session.result.type}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Complexity</div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getComplexityColor(session.result.complexity)}`}>
                {session.result.complexity}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Confidence</div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(session.result.confidence_score)}`}>
                {session.result.confidence_score}%
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">Estimated Time</div>
              <span className="text-sm">{session.result.estimated_time_minutes} min</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Strategy</div>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {session.result.strategy}
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Reasoning</div>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {session.result.reasoning}
              </p>
            </div>

            {session.result.prerequisites.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Prerequisites</div>
                <ul className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {session.result.prerequisites.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {onResolveIssue && session.result.confidence_score >= 40 && (
            <div className="pt-4 border-t">
              <button
                onClick={() => onResolveIssue(session.result!)}
                disabled={isResolving}
                className={`px-4 py-2 rounded text-white font-medium transition-colors ${
                  isResolving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isResolving ? "Starting Resolution..." : "Resolve Issue"}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Devin will attempt to implement a solution for this issue
              </p>
            </div>
          )}

          {session.result.confidence_score < 40 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-yellow-700 text-sm">
                <strong>Low Confidence:</strong> This issue may require human intervention or additional context.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}