"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { IssuesList } from "./IssuesList";
import { IssueDetailsPanel } from "./IssueDetailsPanel";
import type { GitHubIssue, DevinSessionResponse } from "@/lib/types";

export function Dashboard() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/vinnyhuang-devin-test/typio-kart");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<DevinSessionResponse | null>(null);
  const [analyzingIssueId, setAnalyzingIssueId] = useState<number | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);

  // tRPC queries and mutations
  const [parseError, setParseError] = useState<string | null>(null);
  const {
    data: issues, 
    isLoading: issuesLoading 
  } = api.github.getIssues.useQuery(
    { owner, repo, state: "open" },
    { 
      enabled: isConnected && Boolean(owner?.trim()) && Boolean(repo?.trim()),
      retry: false, // Don't retry on 404s
    }
  );

  const analyzeIssueMutation = api.devin.analyzeIssue.useMutation();
  
  // Get all sessions for the current repository
  const { data: allSessions, refetch: refetchSessions } = api.devin.getAllSessions.useQuery(
    { limit: 100 },
    { enabled: isConnected }
  );

  // Poll current session status to update database when sessions complete
  const sessionStatusQuery = api.devin.getSessionStatus.useQuery(
    { sessionId: currentSession?.session_id ?? "" },
    { 
      enabled: !!currentSession?.session_id && (currentSession.status === "running" || currentSession.status_enum === "working"),
      refetchInterval: 5000,
    }
  );



  // Get sessions for selected issue
  const selectedIssueSessions = React.useMemo(() => {
    if (!allSessions || !selectedIssue) return [];
    
    return allSessions.filter(session => 
      session.issue.githubId === BigInt(selectedIssue.id)
    );
  }, [allSessions, selectedIssue]);

  const handleConnectRepo = async () => {
    try {
      setParseError(null);
      // Parse the URL client-side
      const match = /github\.com\/([^\/]+)\/([^\/]+)/.exec(repoUrl);
      if (!match) {
        throw new Error("Invalid GitHub repository URL");
      }
      
      const ownerName = match[1]!;
      const repoName = match[2]!.replace(/\.git$/, "");
      
      // Repository validation will happen when we fetch issues
      
      setOwner(ownerName);
      setRepo(repoName);
      setIsConnected(true);
      // Query will auto-enable and fetch when state updates
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setParseError(errorMessage);
      console.error("Error connecting to repository:", error);
      // Reset connection state on error
      setIsConnected(false);
    }
  };

  const handleAnalyzeIssue = async (issue: GitHubIssue) => {
    try {
      setAnalyzingIssueId(issue.id);
      const result = await analyzeIssueMutation.mutateAsync({
        owner,
        repo,
        issueNumber: issue.number,
      });

      if (result.alreadyRunning) {
        alert("Analysis is already running for this issue");
      }

      // Set up session tracking
      setCurrentSession({
        session_id: result.sessionId,
        status: "running",
        status_enum: "working",
      });
    } catch (error) {
      console.error("Error analyzing issue:", error);
      alert("Failed to start analysis. Please try again.");
    } finally {
      setAnalyzingIssueId(null);
    }
  };

  const handleSessionUpdate = useCallback((session: DevinSessionResponse) => {
    console.log(`🔄 Dashboard: Updating session ${session.session_id}:`, {
      status: session.status,
      status_enum: session.status_enum,
      hasResult: !!(session as any).result
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

  // Handle session status updates from polling
  React.useEffect(() => {
    if (sessionStatusQuery.data) {
      console.log(`📡 Dashboard: Received polling data for ${sessionStatusQuery.data.session_id}:`, {
        status: sessionStatusQuery.data.status,
        status_enum: sessionStatusQuery.data.status_enum,
        hasResult: !!(sessionStatusQuery.data as any).result,
        isEnabled: sessionStatusQuery.data.session_id && (sessionStatusQuery.data.status === "running" || sessionStatusQuery.data.status_enum === "working")
      });
      handleSessionUpdate(sessionStatusQuery.data);
    }
  }, [sessionStatusQuery.data, handleSessionUpdate]);


  const getConnectionStatus = () => {
    if (!isConnected || !owner || !repo) return { text: "Not Connected", color: "red" };
    if (issuesLoading) return { text: "Loading...", color: "yellow" };
    return { text: "Connected", color: "green" };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Mock Mode Banner */}
          {process.env.NODE_ENV === "development" && process.env.USE_MOCK_DEVIN === "true" && (
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
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Repository Connection</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Repository URL
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    id="repo-url"
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/vinnyhuang-devin-test/typio-kart"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleConnectRepo}
                      disabled={!repoUrl.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Connect
                    </button>
                    {process.env.NODE_ENV === "development" && (
                      <button
                        onClick={async () => {
                          setRepoUrl("https://github.com/facebook/react");
                          await new Promise(resolve => setTimeout(resolve, 100)); // Let state update
                          await handleConnectRepo();
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                      >
                        Demo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    connectionStatus.color === "green" ? "bg-green-500" :
                    connectionStatus.color === "yellow" ? "bg-yellow-500" :
                    "bg-red-500"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  Status: {connectionStatus.text}
                </span>
                {isConnected && (
                  <span className="text-sm text-gray-600">
                    • Connected to {owner}/{repo}
                  </span>
                )}
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-700 text-sm">
                    {parseError}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          {isConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Issues List */}
              <div className="bg-white shadow rounded-lg p-6">
                {issuesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-gray-600">Loading issues...</span>
                  </div>
                ) : (
                  <IssuesList
                    issues={issues ?? []}
                    selectedIssue={selectedIssue}
                    onSelectIssue={setSelectedIssue}
                  />
                )}
              </div>

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
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium mb-2">Select an Issue</h3>
                    <p>Choose an issue from the list to see details and manage analysis sessions</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isConnected && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-medium mb-2">Connect to a Repository</h3>
                <p>Enter a GitHub repository URL above to get started with issue analysis</p>
                <div className="mt-4 text-sm text-gray-400">
                  Try: https://github.com/vinnyhuang-devin-test/typio-kart
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}