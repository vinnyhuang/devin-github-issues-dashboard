"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { AnalyzeTab } from "./tabs/AnalyzeTab";
import { ResolveTab } from "./tabs/ResolveTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { TABS, ISSUE_TITLE_TRUNCATE_LENGTH } from "@/constants";
import { truncateText, isAnalysisResult } from "@/lib/utils";
import type { 
  GitHubIssue, 
  DatabaseSession, 
  DevinSessionResponse, 
  TabType,
  DevinAnalysisResult
} from "@/lib/types";

interface IssueDetailsPanelProps {
  issue: GitHubIssue;
  sessions: unknown[];
  latestAnalysis?: unknown;
  latestResolution?: unknown;
  currentAnalysisSession?: DevinSessionResponse;
  currentResolutionSession?: DevinSessionResponse;
  onAnalyzeIssue: () => void;
  onStartResolution: (analysisResult: DevinAnalysisResult) => Promise<void>;
  onRetryResolution: () => void;
  isAnalyzing: boolean;
  isResolving: boolean;
  analyzingIssueId?: number;
  resolvingIssueId?: number;
  errorMessage?: string | null;
}

export function IssueDetailsPanel({
  issue,
  sessions,
  latestAnalysis,
  latestResolution,
  currentAnalysisSession,
  currentResolutionSession,
  onAnalyzeIssue,
  onStartResolution,
  onRetryResolution,
  isAnalyzing,
  isResolving,
  analyzingIssueId,
  resolvingIssueId: _resolvingIssueId,
  errorMessage
}: IssueDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("analyze");

  // Check if Resolve tab should be enabled
  const canResolve = latestAnalysis && 
    typeof latestAnalysis === 'object' && 
    'result' in latestAnalysis && 
    latestAnalysis.result &&
    isAnalysisResult(latestAnalysis.result);

  // Truncate title if too long
  const truncatedTitle = truncateText(issue.title, ISSUE_TITLE_TRUNCATE_LENGTH);

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <CardTitle>
          Issue #{issue.number}: {truncatedTitle}
        </CardTitle>
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
      </CardHeader>

      <CardContent>
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {TABS.map((tab) => {
              const isDisabled = tab.key === "resolve" && !canResolve;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => !isDisabled && setActiveTab(tab.key)}
                  disabled={isDisabled}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-600"
                      : isDisabled
                      ? "border-transparent text-gray-300 cursor-not-allowed"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  title={isDisabled ? "Complete a successful analysis first" : ""}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "analyze" && (
          <AnalyzeTab
            issue={issue}
            latestAnalysis={latestAnalysis as DatabaseSession}
            currentSession={currentAnalysisSession}
            isAnalyzing={isAnalyzing}
            analyzingIssueId={analyzingIssueId}
            onAnalyzeIssue={onAnalyzeIssue}
            onSwitchToResolve={() => setActiveTab("resolve")}
          />
        )}
        
        {activeTab === "resolve" && (
          <ResolveTab
            issue={issue}
            latestAnalysis={latestAnalysis as DatabaseSession}
            latestResolution={latestResolution as DatabaseSession}
            currentResolutionSession={currentResolutionSession}
            onStartResolution={onStartResolution}
            isResolving={isResolving}
            errorMessage={errorMessage}
            onRetryResolution={onRetryResolution}
          />
        )}
        
        {activeTab === "history" && (
          <HistoryTab sessions={sessions as DatabaseSession[]} />
        )}
      </CardContent>
    </Card>
  );
}