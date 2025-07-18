import React from "react";
import { IssueCard } from "./IssueCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import type { GitHubIssue } from "@/lib/types";

interface IssuesListProps {
  issues: GitHubIssue[];
  selectedIssue: GitHubIssue | null;
  onSelectIssue: (issue: GitHubIssue) => void;
  isLoading?: boolean;
}

export function IssuesList({ 
  issues, 
  selectedIssue, 
  onSelectIssue,
  isLoading = false 
}: IssuesListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">Loading issues...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
            <p>This repository doesn&apos;t have any open issues.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-h-[700px]">
      <CardHeader>
        <CardTitle>
          Repository Issues ({issues.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isSelected={selectedIssue?.id === issue.id}
              onClick={() => onSelectIssue(issue)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}