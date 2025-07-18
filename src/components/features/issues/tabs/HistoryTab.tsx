"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/ui";
import { formatTimestamp, isDevinSessionComplete } from "@/lib/utils";
import type { DatabaseSession } from "@/lib/types";

interface HistoryTabProps {
  sessions: DatabaseSession[];
}

export function HistoryTab({ sessions }: HistoryTabProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium mb-2">No History</h3>
        <p>No sessions have been run for this issue yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div key={session.id} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <StatusBadge status={session.status} variant="compact" />
              <span className="text-sm text-gray-600">
                {session.type === "analysis" ? "Analysis" : "Resolution"}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatTimestamp(session.createdAt)}
            </span>
          </div>
          
          {session.result && isDevinSessionComplete(session.status) ? (
            <div className="mt-2">
              <button
                onClick={() => toggleSessionExpansion(session.id)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <span className="mr-1">
                  {expandedSessions.has(session.id) ? "▼" : "▶"}
                </span>
                {expandedSessions.has(session.id) ? "Hide details" : "See details"}
              </button>
              
              {expandedSessions.has(session.id) && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="text-xs text-gray-500 mb-2 font-medium">Session Result (JSON):</div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto bg-gray-50 p-2 rounded border">
                    {JSON.stringify(session.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}