"use client";

import React, { useState } from "react";
import { ISSUE_BODY_TRUNCATE_LENGTH } from "@/constants";
import { truncateText, formatDate } from "@/lib/utils";
import type { IssueCardProps } from "@/lib/types";

export function IssueCard({ issue, isSelected, onClick }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const displayBody = issue.body 
    ? (isExpanded 
        ? issue.body 
        : truncateText(issue.body, ISSUE_BODY_TRUNCATE_LENGTH))
    : "No description provided";

  return (
    <div
      onClick={onClick}
      className={`
        p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md
        ${isSelected 
          ? "border-blue-500 bg-blue-50 shadow-md" 
          : "border-gray-200 hover:border-gray-300"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`
            px-2 py-1 rounded text-xs font-medium
            ${issue.state === "open" 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
            }
          `}>
            {issue.state}
          </span>
          <span className="text-sm text-gray-600">
            #{issue.number}
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          {formatDate(issue.created_at)}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-medium text-gray-900 mb-2 leading-tight">
        {issue.title}
      </h3>

      {/* Body */}
      <div className="text-sm text-gray-600 mb-3">
        <p className="whitespace-pre-wrap break-words">
          {displayBody}
        </p>
        
        {issue.body && issue.body.length > ISSUE_BODY_TRUNCATE_LENGTH && (
          <button
            onClick={toggleExpansion}
            className="text-blue-600 hover:text-blue-800 text-xs mt-1 font-medium"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>by {issue.user.login}</span>
          {issue.comments > 0 && (
            <span>{issue.comments} comment{issue.comments !== 1 ? 's' : ''}</span>
          )}
        </div>

        {issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {issue.labels.slice(0, 3).map((label) => (
              <span
                key={label.id}
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ 
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`
                }}
              >
                {label.name}
              </span>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-gray-400">
                +{issue.labels.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}