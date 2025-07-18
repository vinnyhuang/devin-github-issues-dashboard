"use client";

import React, { useState } from "react";
import { formatTimestamp } from "@/lib/utils";
import type { DevinMessage } from "@/lib/types";

interface MessageStreamProps {
  messages?: DevinMessage[];
  isExpanded?: boolean;
  className?: string;
}

export function MessageStream({ messages = [], isExpanded = false, className = "" }: MessageStreamProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  if (!messages.length) {
    return null;
  }

  const isDevinMessage = (type: string) => type === "devin_message";

  const getMessageIcon = (type: string) => {
    return isDevinMessage(type) ? "🤖" : "👤";
  };

  const getMessageStyles = (type: string) => {
    if (isDevinMessage(type)) {
      // Devin messages: Blue theme with bot-like styling
      return {
        container: "bg-blue-50 border-l-4 border-blue-400",
        text: "text-blue-900",
        timestamp: "text-blue-600 opacity-75"
      };
    } else {
      // User messages: Gray theme
      return {
        container: "bg-gray-50",
        text: "text-gray-700",
        timestamp: "text-gray-600 opacity-75"
      };
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {expanded ? "Hide details" : "Show details"}
          </span>
          <span className="text-gray-400">
            {expanded ? "▲" : "▶"}
          </span>
        </div>
      </button>

      {/* Expandable message list */}
      {expanded && (
        <div className="max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              No messages yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.map((message, index) => {
                const styles = getMessageStyles(message.type);
                return (
                  <div
                    key={index}
                    className={`p-3 text-sm ${styles.container}`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="flex-shrink-0 mt-0.5">
                        {getMessageIcon(message.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`break-words ${styles.text}`}>{message.message}</p>
                        <p className={`text-xs mt-1 ${styles.timestamp}`}>
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}