import type { ConfidenceLevel, TabType, DevinStatusEnum } from "@/lib/types";

// UI Constants
export const ISSUE_BODY_TRUNCATE_LENGTH = 140;
export const ISSUE_TITLE_TRUNCATE_LENGTH = 60;

// Session Polling
export const SESSION_POLLING_INTERVAL = 5000; // 5 seconds
export const MAX_POLLING_ATTEMPTS = 60;

// Default Repository
export const DEFAULT_REPO_URL = "https://github.com/vinnyhuang-devin-test/typio-kart";
export const DEMO_REPO_URL = "https://github.com/facebook/react";

// Status Mappings
export const STATUS_COLORS: Record<DevinStatusEnum, string> = {
  working: "bg-blue-100 text-blue-700",
  blocked: "bg-yellow-100 text-yellow-700",
  expired: "bg-red-100 text-red-700",
  finished: "bg-green-100 text-green-700",
  suspend_requested: "bg-orange-100 text-orange-700",
  suspend_requested_frontend: "bg-orange-100 text-orange-700",
  resume_requested: "bg-blue-100 text-blue-700",
  resume_requested_frontend: "bg-blue-100 text-blue-700",
  resumed: "bg-blue-100 text-blue-700",
};

export const STATUS_TEXT: Record<DevinStatusEnum, string> = {
  working: "Working",
  blocked: "Blocked",
  expired: "Expired",
  finished: "Finished",
  suspend_requested: "Suspending",
  suspend_requested_frontend: "Suspending",
  resume_requested: "Resuming",
  resume_requested_frontend: "Resuming",
  resumed: "Resumed",
};

// Confidence Level Mappings
export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  { score: 90, level: "very-confident", color: "green" },
  { score: 70, level: "confident", color: "blue" },
  { score: 50, level: "moderate", color: "yellow" },
  { score: 30, level: "low", color: "yellow" },
  { score: 0, level: "very-low", color: "red" },
];

export const getConfidenceLevel = (score: number): ConfidenceLevel => {
  return CONFIDENCE_LEVELS.find(level => score >= level.score) ?? CONFIDENCE_LEVELS[CONFIDENCE_LEVELS.length - 1]!;
};

// Tab Configuration
export const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: "analyze", label: "Analyze", icon: "🔍" },
  { key: "resolve", label: "Resolve", icon: "🔧" },
  { key: "history", label: "History", icon: "📋" },
];

// Issue Type Icons and Colors
export const ISSUE_TYPE_CONFIG = {
  bug: { icon: "🐛", color: "bg-red-100 text-red-700" },
  feature: { icon: "✨", color: "bg-blue-100 text-blue-700" },
  documentation: { icon: "📝", color: "bg-gray-100 text-gray-700" },
  enhancement: { icon: "⚡", color: "bg-purple-100 text-purple-700" },
  maintenance: { icon: "🔧", color: "bg-orange-100 text-orange-700" },
  question: { icon: "❓", color: "bg-yellow-100 text-yellow-700" },
} as const;

// Complexity Colors
export const COMPLEXITY_COLORS = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
} as const;

// Environment Checks
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const USE_MOCK_DEVIN = process.env.USE_MOCK_DEVIN === "true";

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_REPO_URL: "Invalid GitHub repository URL",
  ANALYSIS_FAILED: "Failed to start analysis. Please try again.",
  RESOLUTION_FAILED: "Failed to start resolution. Please try again.",
  SESSION_NOT_FOUND: "Session not found",
  ISSUE_NOT_FOUND: "Issue not found in database",
  UNAUTHORIZED: "Authentication required",
  NETWORK_ERROR: "Network error. Please check your connection.",
} as const;