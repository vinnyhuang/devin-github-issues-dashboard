import type { DevinAnalysisResult, DevinResolutionResult } from "@/lib/types";

// Utility function for className concatenation
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Type guard for analysis result
export function isAnalysisResult(result: unknown): result is DevinAnalysisResult {
  if (typeof result !== 'object' || result === null) return false;
  
  const obj = result as Record<string, unknown>;
  return (
    'type' in obj && typeof obj.type === 'string' &&
    'complexity' in obj && typeof obj.complexity === 'string' &&
    'confidence_score' in obj && typeof obj.confidence_score === 'number' &&
    'strategy' in obj && typeof obj.strategy === 'string' &&
    'scope_analysis' in obj && typeof obj.scope_analysis === 'string' &&
    'reasoning' in obj && typeof obj.reasoning === 'string'
  );
}

// Type guard for resolution result
export function isResolutionResult(result: unknown): result is DevinResolutionResult {
  if (typeof result !== 'object' || result === null) return false;
  
  const obj = result as Record<string, unknown>;
  return (
    'summary' in obj && typeof obj.summary === 'string' &&
    (obj.pull_request_url === undefined || typeof obj.pull_request_url === 'string')
  );
}

// Repository URL parsing
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = /github\.com\/([^\/]+)\/([^\/]+)/.exec(url);
  if (!match) return null;
  
  const owner = match[1];
  const repo = match[2]?.replace(/\.git$/, "");
  
  if (!owner || !repo) return null;
  
  return { owner, repo };
}

// Text truncation utility
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// Date formatting utilities
export function formatTimestamp(date: Date | string): string {
  return new Date(date).toLocaleString();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

// Session status helpers
export function isSessionComplete(status: string): boolean {
  return ["completed", "stopped", "blocked"].includes(status);
}

export function isSessionRunning(status: string): boolean {
  return status === "running";
}

export function isSessionFailed(status: string): boolean {
  return status === "failed";
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}