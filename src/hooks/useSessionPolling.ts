import { useEffect } from "react";
import { api } from "@/trpc/react";
import { SESSION_POLLING_INTERVAL } from "@/constants";
import type { DevinSessionResponse } from "@/lib/types";

interface UseSessionPollingParams {
  currentSession: DevinSessionResponse | null;
  onSessionUpdate: (session: DevinSessionResponse) => void;
}

export function useSessionPolling({ currentSession, onSessionUpdate }: UseSessionPollingParams) {
  console.log("🔄 useSessionPolling", { currentSession });
  // Poll current session status to update database when sessions complete
  const sessionStatusQuery = api.devin.getSessionStatus.useQuery(
    { sessionId: currentSession?.session_id ?? "" },
    { 
      enabled: !!currentSession?.session_id && 
        (currentSession.status === "running" || currentSession.status_enum === "working"),
      refetchInterval: SESSION_POLLING_INTERVAL,
    }
  );

  // Handle session status updates from polling
  useEffect(() => {
    if (sessionStatusQuery.data) {
      console.log(`📡 Polling: Received data for ${sessionStatusQuery.data.session_id}:`, {
        status: sessionStatusQuery.data.status,
        status_enum: sessionStatusQuery.data.status_enum,
        hasResult: !!(sessionStatusQuery.data as unknown as { result?: unknown }).result,
      });
      onSessionUpdate(sessionStatusQuery.data);
    }
  }, [sessionStatusQuery.data, onSessionUpdate]);

  return {
    isPolling: sessionStatusQuery.isFetching,
    pollingError: sessionStatusQuery.error,
  };
}