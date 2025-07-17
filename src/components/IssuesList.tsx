"use client";

import { useState } from "react";
import type { GitHubIssue } from "@/lib/types";

interface IssuesListProps {
  issues: GitHubIssue[];
  selectedIssue?: GitHubIssue | null;
  onSelectIssue?: (issue: GitHubIssue | null) => void;
}

export function IssuesList({ 
  issues, 
  selectedIssue,
  onSelectIssue
}: IssuesListProps) {
  const [expandedBodies, setExpandedBodies] = useState<Set<number>>(new Set());

  const getStateColor = (state: string) => {
    return state === "open" ? "text-green-600" : "text-red-600";
  };

  const getStateBg = (state: string) => {
    return state === "open" ? "bg-green-100" : "bg-red-100";
  };

  const toggleBodyExpansion = (issueId: number) => {
    setExpandedBodies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">GitHub Issues</h2>
      
      {issues.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No issues found. Try connecting to a repository first.
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                selectedIssue?.id === issue.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
              onClick={() => onSelectIssue?.(selectedIssue?.id === issue.id ? null : issue)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStateBg(issue.state)} ${getStateColor(issue.state)}`}>
                      {issue.state}
                    </span>
                    <span className="text-sm text-gray-600">#{issue.number}</span>
                  </div>
                  
                  <h3 className="font-medium text-lg mb-2">{issue.title}</h3>
                  
                  {issue.body && (
                    <div className="text-gray-600 text-sm mb-3">
                      <p className="whitespace-pre-wrap">
                        {expandedBodies.has(issue.id) 
                          ? issue.body 
                          : `${issue.body.slice(0, 140)}${issue.body.length > 140 ? "..." : ""}`
                        }
                      </p>
                      {issue.body.length > 140 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBodyExpansion(issue.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-1"
                        >
                          {expandedBodies.has(issue.id) ? "See less" : "See more"}
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Created by {issue.user.login}</span>
                    <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                    <span>{issue.comments} comments</span>
                  </div>
                  
                  {issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {issue.labels.map((label) => (
                        <span
                          key={label.id}
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: `#${label.color}` }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedIssue?.id === issue.id && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div>
                      <strong>URL:</strong>{" "}
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {issue.html_url}
                      </a>
                    </div>
                    {issue.assignees.length > 0 && (
                      <div>
                        <strong>Assignees:</strong> {issue.assignees.map(a => a.login).join(", ")}
                      </div>
                    )}
                    {issue.milestone && (
                      <div>
                        <strong>Milestone:</strong> {issue.milestone.title}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}