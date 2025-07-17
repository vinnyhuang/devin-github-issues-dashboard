import { env } from "@/env";
import { devinClient } from "./devin";
import { mockDevinClient } from "./devin-mock";

/**
 * Factory function that returns either the real Devin client or mock client
 * based on the USE_MOCK_DEVIN environment variable
 */
export function createDevinClient() {
  const useMock = env.USE_MOCK_DEVIN === "true";
  
  if (useMock) {
    console.log("🎭 Using mock Devin client for development");
    return mockDevinClient;
  } else {
    console.log("🤖 Using real Devin API client");
    return devinClient;
  }
}

export const devinClientInstance = createDevinClient();