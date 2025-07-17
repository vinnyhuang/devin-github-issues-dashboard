"use client";

import React, { useState } from "react";
import { Button, StatusBadge, LoadingSpinner } from "@/components/ui";
import { isAnalysisResult, isResolutionResult, formatTimestamp, isSessionComplete } from "@/lib/utils";
import { getConfidenceLevel } from "@/constants";
import type { 
  DatabaseSession, 
  DevinAnalysisResult
} from "@/lib/types";

interface ResolveTabProps {
  latestAnalysis?: DatabaseSession;
  latestResolution?: DatabaseSession;
  onStartResolution: (analysisResult: DevinAnalysisResult) => Promise<void>;
  isResolving: boolean;
  errorMessage?: string | null;
  onRetryResolution: () => void;
}

export function ResolveTab({
  latestAnalysis,
  latestResolution,
  onStartResolution,
  isResolving,
  errorMessage,
  onRetryResolution
}: ResolveTabProps) {
  const [customizePrompt, setCustomizePrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // Check if Resolve tab should be enabled
  const canResolve = latestAnalysis && 
    isSessionComplete(latestAnalysis.status) &&
    latestAnalysis.result &&
    isAnalysisResult(latestAnalysis.result);

  // If no analysis is ready, show disabled state
  if (!canResolve) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🔧</div>
          <h3 className="text-lg font-medium mb-2">Analysis Required</h3>
          <p>Complete a successful analysis before resolving this issue.</p>
          {latestAnalysis?.status === "running" && (
            <p className="text-sm mt-2">Analysis is currently in progress...</p>
          )}
          {latestAnalysis?.status === "failed" && (
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
          <StatusBadge status={latestResolution.status} />
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <span>
            {latestResolution.status === "running" 
              ? `Started: ${formatTimestamp(latestResolution.createdAt)}`
              : `Completed: ${formatTimestamp(latestResolution.createdAt)}`
            }
          </span>
        </div>

        {latestResolution.status === "running" ? (
          <LoadingSpinner 
            size="lg" 
            text="Devin is working on resolving this issue" 
          />
        ) : latestResolution.result && isSessionComplete(latestResolution.status) && isResolutionResult(latestResolution.result) ? (
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
            <Button
              variant="danger"
              size="sm"
              onClick={onRetryResolution}
              disabled={isResolving}
              isLoading={isResolving}
            >
              Retry Resolution
            </Button>
          </div>
        ) : null}

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="success"
            onClick={() => latestAnalysis?.result && isAnalysisResult(latestAnalysis.result) && onStartResolution(latestAnalysis.result)}
            disabled={isResolving || !latestAnalysis?.result || !isAnalysisResult(latestAnalysis.result)}
            isLoading={isResolving}
          >
            Re-resolve
          </Button>
        </div>
      </div>
    );
  }

  if (!latestAnalysis?.result || !isAnalysisResult(latestAnalysis.result)) {
    return null;
  }

  // Show staged resolution from analysis
  const analysisResult = latestAnalysis.result;
  
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
                getConfidenceLevel(analysisResult.confidence_score).color === "green" ? "bg-green-100 text-green-700" :
                getConfidenceLevel(analysisResult.confidence_score).color === "blue" ? "bg-blue-100 text-blue-700" :
                getConfidenceLevel(analysisResult.confidence_score).color === "yellow" ? "bg-yellow-100 text-yellow-700" :
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
              <Button
                variant="danger"
                size="sm"
                onClick={onRetryResolution}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="success"
              size="lg"
              disabled={isResolving}
              isLoading={isResolving}
              onClick={() => onStartResolution(analysisResult)}
            >
              Start Resolution
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}