import { useMemo } from "react";
import { api } from "@/trpc/react";
import type { GitHubIssue, DatabaseSession } from "@/lib/types";

interface UseSessionsParams {
  enabled?: boolean;
}

export function useSessions({ enabled = true }: UseSessionsParams) {
  const { data: allSessions, refetch: refetchSessions } = api.devin.getAllSessions.useQuery(
    { limit: 100 },
    { enabled }
  );

  return {
    allSessions: allSessions ?? [],
    refetchSessions,
  };
}

interface UseIssueSessionsParams {
  issue: GitHubIssue | null;
  allSessions: DatabaseSession[];
}

export function useIssueSessions({ issue, allSessions }: UseIssueSessionsParams) {
  const sessions = useMemo(() => {
    if (!allSessions || !issue) return [];
    
    return allSessions.filter(session => 
      session.issue.githubId === BigInt(issue.id)
    );
  }, [allSessions, issue]);

  // Get the most recent analysis session
  const latestAnalysis = useMemo(() => {
    return sessions
      .filter(s => s.type === "analysis")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [sessions]);

  // Get the most recent resolution session
  const latestResolution = useMemo(() => {
    return sessions
      .filter(s => s.type === "resolution")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [sessions]);

  return {
    sessions,
    latestAnalysis,
    latestResolution,
  };
}