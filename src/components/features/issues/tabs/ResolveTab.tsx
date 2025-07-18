"use client";

import React, { useState } from "react";
import { Button, StatusBadge, LoadingSpinner, MessageStream } from "@/components/ui";
import { isAnalysisResult, isResolutionResult, formatTimestamp, isDevinSessionComplete, isDevinSessionRunning } from "@/lib/utils";
import { getConfidenceLevel } from "@/constants";
import { CustomizePromptSection } from "./CustomizePromptSection";
import type { 
  DatabaseSession, 
  DevinAnalysisResult,
  DevinSessionResponse,
  GitHubIssue
} from "@/lib/types";

interface ResolveTabProps {
  issue: GitHubIssue;
  latestAnalysis?: DatabaseSession;
  latestResolution?: DatabaseSession;
  currentResolutionSession?: DevinSessionResponse;
  onStartResolution: (analysisResult: DevinAnalysisResult) => Promise<void>;
  isResolving: boolean;
  errorMessage?: string | null;
  onRetryResolution: () => void;
}

export function ResolveTab({
  issue,
  latestAnalysis,
  latestResolution,
  currentResolutionSession,
  onStartResolution,
  isResolving,
  errorMessage,
  onRetryResolution
}: ResolveTabProps) {
  const [customizePrompt, setCustomizePrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // Check if Resolve tab should be enabled
  const canResolve = latestAnalysis && 
    isDevinSessionComplete(latestAnalysis.status) &&
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
          {latestAnalysis?.status === "working" && (
            <p className="text-sm mt-2">Analysis is currently in progress...</p>
          )}
          {latestAnalysis?.status === "expired" && (
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
            {isDevinSessionRunning(latestResolution.status)
              ? `Started: ${formatTimestamp(latestResolution.createdAt)}`
              : `Completed: ${formatTimestamp(latestResolution.createdAt)}`
            }
          </span>
        </div>

        {isDevinSessionRunning(latestResolution.status) ? (
          <div className="space-y-4">
            <LoadingSpinner 
              size="md" 
              text="Devin is working on resolving this issue" 
            />

            {/* Real-time message stream */}
            {currentResolutionSession?.messages && currentResolutionSession.messages.length > 0 && (
              <MessageStream 
                messages={currentResolutionSession.messages}
              />
            )}
          </div>
        ) : latestResolution.result && isDevinSessionComplete(latestResolution.status) && isResolutionResult(latestResolution.result) ? (
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
        ) : latestResolution.status === "expired" ? (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-700 text-sm mb-2">
              <strong>❌ Resolution Failed:</strong> The resolution session encountered an error and could not complete.
            </p>
            <Button
              variant="danger"
              onClick={onRetryResolution}
              disabled={isResolving}
              isLoading={isResolving}
            >
              Retry Resolution
            </Button>
          </div>
        ) : null}

        <div className="pt-4 border-t">
          {/* Customize Prompt Section for Re-resolve */}
          <div className="mb-4">
            <CustomizePromptSection
              issue={issue}
              analysisResult={latestAnalysis.result as DevinAnalysisResult}
              customizePrompt={customizePrompt}
              customPrompt={customPrompt}
              onCustomizePromptChange={setCustomizePrompt}
              onCustomPromptChange={setCustomPrompt}
              checkboxId="customizeReResolvePrompt"
              textareaId="customReResolvePrompt"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => latestAnalysis?.result && isAnalysisResult(latestAnalysis.result) && onStartResolution(latestAnalysis.result)}
              disabled={isResolving || !latestAnalysis?.result || !isAnalysisResult(latestAnalysis.result)}
              isLoading={isResolving}
            >
              Re-resolve
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Re-resolution will only run if the resolution prompt has changed since the last attempt.
          </p>
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
          <CustomizePromptSection
            issue={issue}
            analysisResult={analysisResult}
            customizePrompt={customizePrompt}
            customPrompt={customPrompt}
            onCustomizePromptChange={setCustomizePrompt}
            onCustomPromptChange={setCustomPrompt}
            checkboxId="customizePrompt"
            textareaId="customPrompt"
          />

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm mb-2">{errorMessage}</p>
              <Button
                variant="danger"
                onClick={onRetryResolution}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="success"
              disabled={isResolving}
              isLoading={isResolving}
              onClick={() => onStartResolution(analysisResult)}
            >
              Start Resolution
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Resolution will only run again if the prompt has changed from previous attempts.
          </p>
        </div>
      </div>
    </div>
  );
}