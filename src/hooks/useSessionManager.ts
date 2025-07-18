"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import { isDevinSessionRunning } from "@/lib/utils";
import type { GitHubIssue, DatabaseSession, DevinAnalysisResult, DevinStatusEnum } from "@/lib/types";

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
  
  // Current polling session ID
  pollingSessionId?: string;
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
  
  // Fetch all sessions for the current issue
  const { data: sessionsData, refetch: refetchSessions } = api.github.getSessions.useQuery(
    { 
      owner: owner ?? "", 
      repo: repo ?? "", 
      issueNumber: issue?.number ?? 0
    },
    { 
      enabled: !!(owner && repo && issue?.number),
      refetchInterval: false, // We'll handle refetching manually
    }
  );

  // Poll current session status
  const { data: currentSessionData } = api.devin.getSessionStatus.useQuery(
    { sessionId: state.pollingSessionId ?? "" },
    {
      enabled: !!state.pollingSessionId,
      refetchInterval: 3000, // Poll every 3 seconds
      retry: 3,
    }
  );
  
  // Mutations
  const analyzeIssueMutation = api.devin.analyzeIssue.useMutation();
  const resolveIssueMutation = api.devin.resolveIssue.useMutation();
  
  // Process sessions data
  const sessions = (sessionsData as DatabaseSessionWithIssue[]) ?? [];
  const analysisSessions = sessions.filter(s => s.type === "analysis");
  const resolutionSessions = sessions.filter(s => s.type === "resolution");
  const latestAnalysis = analysisSessions[0];
  const latestResolution = resolutionSessions[0];
  
  // Handle session status updates
  useEffect(() => {
    if (currentSessionData && state.pollingSessionId) {
      // Check if session is complete
      if (currentSessionData.status_enum && !isDevinSessionRunning(currentSessionData.status_enum)) {
        console.log(`✅ Session ${state.pollingSessionId} completed with status: ${currentSessionData.status_enum}`);
        
        // Stop polling by clearing the session ID and update loading states
        setState(prev => ({ 
          ...prev, 
          pollingSessionId: undefined,
          isAnalyzing: false,
          isResolving: false,
          analyzingIssueId: undefined,
          resolvingIssueId: undefined
        }));
        
        // Refresh sessions data to get updated database state
        void refetchSessions();
      }
    }
  }, [currentSessionData, state.pollingSessionId, refetchSessions]);
  
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
      
          // Start polling the new session
      setState(prev => ({ 
        ...prev, 
        pollingSessionId: result.sessionId
      }));
      
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
      
      // Start polling the new session
      setState(prev => ({ 
        ...prev, 
        pollingSessionId: result.sessionId
      }));
      
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
  
  // Manual refresh
  const refreshSessions = useCallback(async () => {
    await refetchSessions();
  }, [refetchSessions]);
  
  return {
    // Data
    sessions,
    latestAnalysis,
    latestResolution,
    currentAnalysisSession: currentSessionData,
    currentResolutionSession: currentSessionData,
    
    // Loading states
    isAnalyzing: state.isAnalyzing,
    isResolving: state.isResolving,
    analyzingIssueId: state.analyzingIssueId,
    resolvingIssueId: state.resolvingIssueId,
    
    // Error state
    errorMessage: state.errorMessage,
    
    // Actions
    startAnalysis,
    startResolution,
    retryResolution,
    refreshSessions,
  };
}