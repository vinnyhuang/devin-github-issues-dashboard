"use client";

import React, { useState, useCallback } from "react";
import { Card } from "@/components/ui";
import { IssuesList } from "../issues/IssuesList";
import { IssueDetailsPanel } from "../issues/IssueDetailsPanel";
import { RepositoryConnection } from "./RepositoryConnection";
import { IS_DEVELOPMENT, USE_MOCK_DEVIN } from "@/constants";
import { getErrorMessage } from "@/lib/utils";
import { useIssues, useSessions, useSessionPolling } from "@/hooks";
import { api } from "@/trpc/react";
import type { GitHubIssue, DevinSessionResponse } from "@/lib/types";

export function Dashboard() {
  const [repoConnection, setRepoConnection] = useState<{ owner: string; repo: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<DevinSessionResponse | null>(null);
  const [analyzingIssueId, setAnalyzingIssueId] = useState<number | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Data fetching hooks
  const { issues, isLoading: issuesLoading } = useIssues({
    owner: repoConnection?.owner ?? "",
    repo: repoConnection?.repo ?? "",
    enabled: isConnected
  });

  const { allSessions, refetchSessions } = useSessions({
    enabled: isConnected
  });

  // tRPC mutations
  const analyzeIssueMutation = api.devin.analyzeIssue.useMutation();

  // Session polling
  const handleSessionUpdate = useCallback((session: DevinSessionResponse) => {
    console.log(`🔄 Dashboard: Updating session ${session.session_id}:`, {
      status: session.status,
      status_enum: session.status_enum,
      hasResult: !!(session as unknown as { result?: unknown }).result
    });
    
    setCurrentSession(session);
    
    // If session completed, refresh sessions after a brief delay
    if (session.status === "stopped" || session.status === "blocked") {
      console.log(`✅ Dashboard: Session ${session.session_id} completed, refreshing sessions in 1s`);
      setTimeout(() => {
        console.log(`🔄 Dashboard: Refreshing sessions after completion of ${session.session_id}`);
        void refetchSessions();
      }, 1000);
    }
  }, [refetchSessions]);

  useSessionPolling({
    currentSession,
    onSessionUpdate: handleSessionUpdate
  });

  // Get sessions for selected issue
  const selectedIssueSessions = React.useMemo(() => {
    if (!allSessions || !selectedIssue) return [];
    
    return allSessions.filter(session => 
      session.issue.githubId === BigInt(selectedIssue.id)
    );
  }, [allSessions, selectedIssue]);

  const handleConnectRepo = useCallback(async (owner: string, repo: string) => {
    try {
      setConnectionError(null);
      setRepoConnection({ owner, repo });
      setIsConnected(true);
      // Reset selected issue when connecting to new repo
      setSelectedIssue(null);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setConnectionError(errorMessage);
      setIsConnected(false);
    }
  }, []);

  const handleAnalyzeIssue = useCallback(async (issue: GitHubIssue) => {
    if (!repoConnection) return;
    
    try {
      setAnalyzingIssueId(issue.id);
      const result = await analyzeIssueMutation.mutateAsync({
        owner: repoConnection.owner,
        repo: repoConnection.repo,
        issueNumber: issue.number,
      });

      if (result.alreadyRunning) {
        // Could show a toast notification here instead
        console.warn("Analysis is already running for this issue");
        return;
      }

      // Set up session tracking
      setCurrentSession({
        session_id: result.sessionId,
        status: "running",
        status_enum: "working",
      });
    } catch (error) {
      console.error("Error analyzing issue:", error);
      // Could show error notification here
    } finally {
      setAnalyzingIssueId(null);
    }
  }, [repoConnection, analyzeIssueMutation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Mock Mode Banner */}
          {IS_DEVELOPMENT && USE_MOCK_DEVIN && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-yellow-400 text-xl mr-3">🎭</span>
                <div>
                  <p className="text-yellow-800 font-medium">Demo Mode Active</p>
                  <p className="text-yellow-700 text-sm">
                    Using mock Devin API responses for demonstration. Analysis results are simulated.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Devin GitHub Issues Dashboard
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Analyze and resolve GitHub issues with Devin AI automation
            </p>
          </div>

          {/* Repository Connection */}
          <RepositoryConnection
            onConnect={handleConnectRepo}
            isConnected={isConnected}
            isLoading={issuesLoading}
            connectedRepo={repoConnection ?? undefined}
          />

          {connectionError && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm">{connectionError}</p>
            </div>
          )}

          {/* Main Content */}
          {isConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Issues List */}
              <IssuesList
                issues={issues}
                selectedIssue={selectedIssue}
                onSelectIssue={setSelectedIssue}
                isLoading={issuesLoading}
              />

              {/* Issue Details Panel */}
              {selectedIssue ? (
                <IssueDetailsPanel
                  issue={selectedIssue}
                  sessions={selectedIssueSessions as never}
                  currentSession={currentSession}
                  onAnalyzeIssue={handleAnalyzeIssue}
                  onSessionUpdate={handleSessionUpdate}
                  isAnalyzing={analyzeIssueMutation.isPending}
                  analyzingIssueId={analyzingIssueId ?? undefined}
                  onRefreshSessions={() => void refetchSessions()}
                />
              ) : (
                <Card>
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium mb-2">Select an Issue</h3>
                    <p>Choose an issue from the list to see details and manage analysis sessions</p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {!isConnected && (
            <Card>
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-medium mb-2">Connect to a Repository</h3>
                <p>Enter a GitHub repository URL above to get started with issue analysis</p>
                <div className="mt-4 text-sm text-gray-400">
                  Try: https://github.com/vinnyhuang-devin-test/typio-kart
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}