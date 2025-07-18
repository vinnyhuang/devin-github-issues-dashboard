"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/trpc/react";
import { isDevinSessionRunning } from "@/lib/utils";
import type { GitHubIssue, DatabaseSession, DevinAnalysisResult, DevinStatusEnum, DevinMessage } from "@/lib/types";

// Database session with included issue data
interface DatabaseSessionWithIssue extends Omit<DatabaseSession, 'status'> {
  status: DevinStatusEnum;
  issue: {
    id: string;
    githubId: bigint;
    number: number;
    title: string;
    body: string | null;
    url: string;
    state: string;
    labels: unknown;
    repository: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

interface SessionManagerState {
  // Loading states
  isAnalyzing: boolean;
  isResolving: boolean;
  analyzingIssueId?: number;
  resolvingIssueId?: number;
  
  // Error states
  errorMessage?: string | null;
}

interface UseSessionManagerProps {
  issue?: GitHubIssue | null;
  owner?: string;
  repo?: string;
}

export function useSessionManager({ issue, owner, repo }: UseSessionManagerProps) {
  const [state, setState] = useState<SessionManagerState>({
    isAnalyzing: false,
    isResolving: false,
  });
  
  // Fetch all sessions for the current issue (only when needed, no polling)
  const { data: sessionsData, refetch: refetchSessions } = api.github.getSessions.useQuery(
    { 
      owner: owner ?? "", 
      repo: repo ?? "", 
      issueNumber: issue?.number ?? 0
    },
    { 
      enabled: !!(owner && repo && issue?.number),
      refetchInterval: false, // No automatic polling - we refresh manually when needed
    }
  );

  // Mutations
  const analyzeIssueMutation = api.devin.analyzeIssue.useMutation();
  const resolveIssueMutation = api.devin.resolveIssue.useMutation();
  
  // Process sessions data with memoization to prevent re-renders
  const processedSessionsData = useMemo(() => {
    const sessions = (sessionsData as DatabaseSessionWithIssue[]) ?? [];
    const analysisSessions = sessions.filter(s => s.type === "analysis");
    const resolutionSessions = sessions.filter(s => s.type === "resolution");
    const latestAnalysis = analysisSessions[0];
    const latestResolution = resolutionSessions[0];
    
    // Get running sessions and their IDs
    const runningSessions = sessions.filter(s => isDevinSessionRunning(s.status));
    const hasRunningAnalysis = analysisSessions.some(s => isDevinSessionRunning(s.status));
    const hasRunningResolution = resolutionSessions.some(s => isDevinSessionRunning(s.status));
    
    return {
      sessions,
      analysisSessions,
      resolutionSessions,
      latestAnalysis,
      latestResolution,
      runningSessions,
      hasRunningAnalysis,
      hasRunningResolution,
    };
  }, [sessionsData]);
  
  const { 
    sessions, 
    latestAnalysis, 
    latestResolution,
    hasRunningAnalysis,
    hasRunningResolution
  } = processedSessionsData;
  
  // Get session IDs for polling (maintain up to 2 sessions: latest analysis and resolution)
  const latestAnalysisSessionId = latestAnalysis && isDevinSessionRunning(latestAnalysis.status) 
    ? latestAnalysis.sessionId : undefined;
  const latestResolutionSessionId = latestResolution && isDevinSessionRunning(latestResolution.status) 
    ? latestResolution.sessionId : undefined;
  
  // Poll ONLY unfinished sessions via Devin API (not the sessions list)
  const { data: analysisSessionData } = api.devin.getSessionStatus.useQuery(
    { sessionId: latestAnalysisSessionId ?? "" },
    {
      enabled: !!latestAnalysisSessionId,
      refetchInterval: 3000, // Poll every 3 seconds for session completion
      retry: 3,
    }
  );
  
  const { data: resolutionSessionData } = api.devin.getSessionStatus.useQuery(
    { sessionId: latestResolutionSessionId ?? "" },
    {
      enabled: !!latestResolutionSessionId,
      refetchInterval: 3000, // Poll every 3 seconds for session completion
      retry: 3,
    }
  );
  
  // When polled sessions complete, refresh the sessions list once to update database
  useEffect(() => {
    const completedSessions: string[] = [];
    
    // Check if analysis session completed
    if (analysisSessionData && latestAnalysisSessionId) {
      if (analysisSessionData.status_enum && !isDevinSessionRunning(analysisSessionData.status_enum)) {
        console.log(`✅ Analysis session ${latestAnalysisSessionId} completed with status: ${analysisSessionData.status_enum}`);
        completedSessions.push(latestAnalysisSessionId);
      }
    }
    
    // Check if resolution session completed
    if (resolutionSessionData && latestResolutionSessionId) {
      if (resolutionSessionData.status_enum && !isDevinSessionRunning(resolutionSessionData.status_enum)) {
        console.log(`✅ Resolution session ${latestResolutionSessionId} completed with status: ${resolutionSessionData.status_enum}`);
        completedSessions.push(latestResolutionSessionId);
      }
    }
    
    // Refresh sessions list once when any session completes (no continuous polling)
    if (completedSessions.length > 0) {
      console.log(`🔄 Refreshing sessions data due to completed sessions: ${completedSessions.join(', ')}`);
      void refetchSessions();
    }
  }, [
    analysisSessionData?.status_enum,
    resolutionSessionData?.status_enum,
    latestAnalysisSessionId,
    latestResolutionSessionId,
    analysisSessionData,
    resolutionSessionData,
    refetchSessions
  ]);
  
  // Update loading states based on running sessions
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isAnalyzing: prev.isAnalyzing || hasRunningAnalysis,
      isResolving: prev.isResolving || hasRunningResolution,
    }));
  }, [hasRunningAnalysis, hasRunningResolution]);
  
  // Start analysis
  const startAnalysis = useCallback(async () => {
    if (!owner || !repo || !issue) return;
    
    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      analyzingIssueId: issue.id,
      errorMessage: null 
    }));
    
    try {
      const result = await analyzeIssueMutation.mutateAsync({
        owner,
        repo,
        issueNumber: issue.number
      });
      
      console.log(`🚀 Started analysis session: ${result.sessionId}`);
      
      // Refresh sessions to get the new database entry
      await refetchSessions();
      
    } catch (error) {
      console.error("❌ Error starting analysis:", error);
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        analyzingIssueId: undefined,
        errorMessage: error instanceof Error ? error.message : "Failed to start analysis" 
      }));
    }
  }, [owner, repo, issue, analyzeIssueMutation, refetchSessions]);
  
  // Start resolution
  const startResolution = useCallback(async (analysisResult: DevinAnalysisResult) => {
    if (!latestAnalysis) return;
    
    setState(prev => ({ 
      ...prev, 
      isResolving: true, 
      resolvingIssueId: issue?.id,
      errorMessage: null 
    }));
    
    try {
      const result = await resolveIssueMutation.mutateAsync({
        sessionId: latestAnalysis.sessionId,
        analysisResult
      });
      
      console.log(`🚀 Started resolution session: ${result.sessionId}`);
      
      // Refresh sessions to get the new database entry
      await refetchSessions();
      
    } catch (error) {
      console.error("❌ Error starting resolution:", error);
      setState(prev => ({ 
        ...prev, 
        isResolving: false, 
        resolvingIssueId: undefined,
        errorMessage: error instanceof Error ? error.message : "Failed to start resolution" 
      }));
    }
  }, [latestAnalysis, issue, resolveIssueMutation, refetchSessions]);
  
  // Retry resolution
  const retryResolution = useCallback(async () => {
    if (!latestAnalysis?.result) return;
    
    // Type guard to ensure we have a valid analysis result
    if (typeof latestAnalysis.result === 'object' && 
        latestAnalysis.result !== null &&
        'type' in latestAnalysis.result &&
        'complexity' in latestAnalysis.result &&
        'confidence_score' in latestAnalysis.result) {
      await startResolution(latestAnalysis.result as DevinAnalysisResult);
    }
  }, [latestAnalysis, startResolution]);
  
  // Helper function to parse database messages
  const parseMessages = (messages?: string): DevinMessage[] => {
    if (!messages) return [];
    try {
      return JSON.parse(messages) as DevinMessage[];
    } catch (error) {
      console.error('Error parsing messages:', error);
      return [];
    }
  };

  // Return actual polled session data when available, fallback to database data
  const currentAnalysisSession = analysisSessionData ?? (
    latestAnalysis && isDevinSessionRunning(latestAnalysis.status) 
      ? { 
          session_id: latestAnalysis.sessionId, 
          status_enum: latestAnalysis.status, 
          status: latestAnalysis.status,
          structured_output: latestAnalysis.result,
          messages: parseMessages(latestAnalysis.messages)
        }
      : undefined
  );
  
  const currentResolutionSession = resolutionSessionData ?? (
    latestResolution && isDevinSessionRunning(latestResolution.status)
      ? { 
          session_id: latestResolution.sessionId, 
          status_enum: latestResolution.status, 
          status: latestResolution.status,
          structured_output: latestResolution.result,
          messages: parseMessages(latestResolution.messages)
        }
      : undefined
  );
  
  return {
    // Data
    sessions,
    latestAnalysis,
    latestResolution,
    currentAnalysisSession,
    currentResolutionSession,
    
    // Loading states - clear when no sessions are running
    isAnalyzing: state.isAnalyzing && hasRunningAnalysis,
    isResolving: state.isResolving && hasRunningResolution,
    analyzingIssueId: state.analyzingIssueId,
    resolvingIssueId: state.resolvingIssueId,
    
    // Error state
    errorMessage: state.errorMessage,
    
    // Actions
    startAnalysis,
    startResolution,
    retryResolution,
  };
}