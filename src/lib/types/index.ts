// GitHub API Types
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  url: string;
  html_url: string;
  state: "open" | "closed";
  labels: GitHubLabel[];
  user: GitHubUser;
  assignee: GitHubUser | null;
  assignees: GitHubUser[];
  milestone: GitHubMilestone | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  repository_url: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubMilestone {
  id: number;
  title: string;
  description: string | null;
  state: "open" | "closed";
  due_on: string | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
}

// Devin API Types
export type DevinStatusEnum = 
  | "working" 
  | "blocked" 
  | "expired" 
  | "finished" 
  | "suspend_requested" 
  | "suspend_requested_frontend" 
  | "resume_requested" 
  | "resume_requested_frontend" 
  | "resumed";

export interface DevinSessionResponse {
  session_id: string;
  status: string; // Display label - more descriptive
  status_enum: DevinStatusEnum; // Actual enum for logic
  structured_output?: unknown; // Object containing the actual results
  error_message?: string;
}

export interface DevinAnalysisResult {
  type: "bug" | "feature" | "documentation" | "enhancement" | "maintenance" | "question";
  complexity: "low" | "medium" | "high";
  confidence_score: number;
  strategy: string;
  scope_analysis: string;
  reasoning: string;
}

export interface DevinResolutionResult {
  summary: string;
  pull_request_url?: string;
}

export interface DevinCreateSessionRequest {
  prompt: string;
  idempotent?: boolean;
}

export interface DevinMessageRequest {
  message: string;
}

// Database Types
export type SessionType = "analysis" | "resolution";

export interface DatabaseSession {
  id: string;
  sessionId: string;
  type: SessionType;
  status: DevinStatusEnum;
  result: unknown;
  confidenceScore?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  issue: {
    id: string;
    githubId: bigint;
    number: number;
    repository: string;
  };
}

// API Response Types
export interface AnalyzeIssueResponse {
  sessionId: string;
  alreadyRunning?: boolean;
}

export interface ResolveIssueResponse {
  sessionId: string;
  alreadyRunning?: boolean;
}

// Component Props Types
export interface IssueCardProps {
  issue: GitHubIssue;
  isSelected: boolean;
  onClick: () => void;
}

export interface StatusBadgeProps {
  status: DevinStatusEnum;
  variant?: "default" | "compact";
}

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

// Form Types
export interface RepositoryConnectionForm {
  url: string;
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// Utility Types
export type TabType = "analyze" | "resolve" | "history";

export interface ConfidenceLevel {
  score: number;
  level: "very-low" | "low" | "moderate" | "confident" | "very-confident";
  color: "red" | "yellow" | "blue" | "green";
}