"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@/components/ui";
import { DEFAULT_REPO_URL, DEMO_REPO_URL, IS_DEVELOPMENT, ERROR_MESSAGES } from "@/constants";
import { parseGitHubUrl, getErrorMessage } from "@/lib/utils";

interface RepositoryConnectionProps {
  onConnect: (owner: string, repo: string) => void;
  isConnected: boolean;
  isLoading: boolean;
  connectedRepo?: { owner: string; repo: string };
}

export function RepositoryConnection({ 
  onConnect, 
  isConnected, 
  isLoading,
  connectedRepo 
}: RepositoryConnectionProps) {
  const [repoUrl, setRepoUrl] = useState(DEFAULT_REPO_URL);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setError(null);
      
      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        throw new Error(ERROR_MESSAGES.INVALID_REPO_URL);
      }
      
      onConnect(parsed.owner, parsed.repo);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    }
  };

  const handleDemoConnect = async () => {
    setRepoUrl(DEMO_REPO_URL);
    // Allow state to update before connecting
    setTimeout(() => {
      const parsed = parseGitHubUrl(DEMO_REPO_URL);
      if (parsed) {
        onConnect(parsed.owner, parsed.repo);
      }
    }, 100);
  };

  const getConnectionStatus = () => {
    if (!isConnected || !connectedRepo) {
      return { text: "Not Connected", color: "red" };
    }
    if (isLoading) {
      return { text: "Loading...", color: "yellow" };
    }
    return { text: "Connected", color: "green" };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Connection</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              label="GitHub Repository URL"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder={DEFAULT_REPO_URL}
              error={error ?? undefined}
              className="flex-1"
            />
            
            <div className="flex space-x-2 pt-6">
              <Button
                onClick={handleConnect}
                disabled={!repoUrl.trim() || isLoading}
                isLoading={isLoading}
              >
                Connect
              </Button>
              
              {IS_DEVELOPMENT && (
                <Button
                  variant="secondary"
                  onClick={handleDemoConnect}
                  disabled={isLoading}
                >
                  Demo
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                connectionStatus.color === "green" ? "bg-green-500" :
                connectionStatus.color === "yellow" ? "bg-yellow-500" :
                "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-600">
              Status: {connectionStatus.text}
            </span>
            {isConnected && connectedRepo && (
              <span className="text-sm text-gray-600">
                • Connected to {connectedRepo.owner}/{connectedRepo.repo}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}