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

export interface DevinSessionResponse {
  session_id: string;
  status: "running" | "blocked" | "stopped";
  status_enum: "working" | "blocked" | "stopped";
  structured_output?: string;
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