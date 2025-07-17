"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import type { DevinSessionResponse } from "@/lib/types";

interface SessionProgressProps {
  sessionId: string;
  onSessionUpdate?: (session: DevinSessionResponse) => void;
  pollInterval?: number;
}

export function SessionProgress({ 
  sessionId, 
  onSessionUpdate, 
  pollInterval = 5000 
}: SessionProgressProps) {
  const [session, setSession] = useState<DevinSessionResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use tRPC query for session status
  const { data: sessionData, error: queryError, refetch } = api.devin.getSessionStatus.useQuery(
    { sessionId },
    { 
      enabled: isPolling && Boolean(sessionId),
      refetchInterval: isPolling ? pollInterval : false,
      retry: 2,
    }
  );

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
      setIsPolling(false);
      return;
    }

    if (sessionData) {
      setSession(sessionData);
      setError(null);
      
      if (onSessionUpdate) {
        onSessionUpdate(sessionData);
      }

      // Stop polling if session is complete or failed
      if (sessionData.status === "stopped" || sessionData.status === "blocked") {
        setIsPolling(false);
      }
    }
  }, [sessionData, queryError, onSessionUpdate]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "running":
        return { text: "Running", color: "blue", icon: "🔄" };
      case "stopped":
        return { text: "Completed", color: "green", icon: "✅" };
      case "blocked":
        return { text: "Blocked", color: "red", icon: "❌" };
      default:
        return { text: status, color: "gray", icon: "❓" };
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-500">❌</span>
          <div>
            <div className="font-medium text-red-700">Session Error</div>
            <div className="text-sm text-red-600">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Loading session status...</span>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(session.status);

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Session Progress</h4>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{statusDisplay.icon}</span>
          <span 
            className={`px-2 py-1 rounded text-xs font-medium ${
              statusDisplay.color === "blue" ? "bg-blue-100 text-blue-700" :
              statusDisplay.color === "green" ? "bg-green-100 text-green-700" :
              statusDisplay.color === "red" ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-700"
            }`}
          >
            {statusDisplay.text}
          </span>
          <button
            onClick={() => void refetch()}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh status"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm">
          <span className="text-gray-600">Session ID:</span>
          <span className="ml-2 font-mono text-xs">{session.session_id}</span>
        </div>

        {session.status === "running" && (
          <div className="flex items-center space-x-2">
            <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Devin is working on this task...</span>
          </div>
        )}

        {session.status === "stopped" && (
          <div className="text-sm text-green-600">
            ✓ Task completed successfully
          </div>
        )}

        {session.status === "blocked" && (
          <div className="space-y-1">
            <div className="text-sm text-red-600">
              ⚠️ Session is blocked and needs attention
            </div>
            {session.error_message && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {session.error_message}
              </div>
            )}
          </div>
        )}

        {isPolling && session.status === "running" && (
          <div className="text-xs text-gray-500">
            Checking for updates every {pollInterval / 1000} seconds...
          </div>
        )}
      </div>

      {session.structured_output && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-sm font-medium text-gray-700 mb-1">Results</div>
          <div className="text-xs bg-gray-50 p-2 rounded font-mono overflow-x-auto">
            <pre>{JSON.stringify(JSON.parse(session.structured_output), null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}