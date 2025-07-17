"use client";

import React, { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { AnalyzeTab } from "./tabs/AnalyzeTab";
import { ResolveTab } from "./tabs/ResolveTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { TABS, ISSUE_TITLE_TRUNCATE_LENGTH } from "@/constants";
import { truncateText, isAnalysisResult, getErrorMessage } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useIssueSessions } from "@/hooks";
import type { 
  GitHubIssue, 
  DatabaseSession, 
  DevinSessionResponse, 
  TabType,
  DevinAnalysisResult
} from "@/lib/types";

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
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // tRPC mutations
  const resolveIssueMutation = api.devin.resolveIssue.useMutation();

  // Get session data
  const { latestAnalysis, latestResolution } = useIssueSessions({
    issue,
    allSessions: sessions
  });

  // Check if Resolve tab should be enabled
  const canResolve = latestAnalysis && 
    ["completed", "stopped", "blocked"].includes(latestAnalysis.status) &&
    latestAnalysis.result &&
    isAnalysisResult(latestAnalysis.result);

  const handleStartResolution = useCallback(async (analysisResult: DevinAnalysisResult) => {
    if (!latestAnalysis) return;
    
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
      const errorMsg = getErrorMessage(error);
      setErrorMessage(`Error: ${errorMsg}`);
    } finally {
      setIsResolving(false);
    }
  }, [latestAnalysis, resolveIssueMutation, onSessionUpdate, onRefreshSessions]);

  const handleRetryResolution = useCallback(() => {
    setErrorMessage(null);
    if (latestAnalysis?.result && isAnalysisResult(latestAnalysis.result)) {
      void handleStartResolution(latestAnalysis.result);
    }
  }, [latestAnalysis, handleStartResolution]);

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
            latestAnalysis={latestAnalysis}
            currentSession={currentSession}
            isAnalyzing={isAnalyzing}
            analyzingIssueId={analyzingIssueId}
            onAnalyzeIssue={onAnalyzeIssue}
            onRefreshSessions={onRefreshSessions}
          />
        )}
        
        {activeTab === "resolve" && (
          <ResolveTab
            latestAnalysis={latestAnalysis}
            latestResolution={latestResolution}
            onStartResolution={handleStartResolution}
            isResolving={isResolving}
            errorMessage={errorMessage}
            onRetryResolution={handleRetryResolution}
          />
        )}
        
        {activeTab === "history" && (
          <HistoryTab sessions={sessions} />
        )}
      </CardContent>
    </Card>
  );
}