import { api } from "@/trpc/react";

interface UseIssuesParams {
  owner: string;
  repo: string;
  enabled?: boolean;
}

export function useIssues({ owner, repo, enabled = true }: UseIssuesParams) {
  const {
    data: issues,
    isLoading,
    error,
    refetch
  } = api.github.getIssues.useQuery(
    { owner, repo, state: "open" },
    { 
      enabled: enabled && Boolean(owner?.trim()) && Boolean(repo?.trim()),
      retry: false, // Don't retry on 404s
    }
  );

  return {
    issues: issues ?? [],
    isLoading,
    error,
    refetch,
  };
}