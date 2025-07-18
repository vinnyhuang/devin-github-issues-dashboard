import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { devinClientInstance as devinClient } from "@/lib/devin-factory";
import { githubClient } from "@/lib/github";
import { db } from "@/server/db";
import { isDevinSessionComplete } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const devinRouter = createTRPCRouter({
  analyzeIssue: publicProcedure
    .input(z.object({ 
      owner: z.string().min(1, "Owner is required"),
      repo: z.string().min(1, "Repository name is required"),
      issueNumber: z.number()
    }))
    .mutation(async ({ input }) => {
      try {
        // Get the GitHub issue
        const githubIssue = await githubClient.getIssue(
          input.owner,
          input.repo,
          input.issueNumber
        );

        // Find the issue in our database
        const issue = await db.issue.findUnique({
          where: { githubId: BigInt(githubIssue.id) }
        });

        if (!issue) {
          throw new Error("Issue not found in database");
        }

        // Check if there's already a running analysis session
        const existingSession = await db.devinSession.findFirst({
          where: {
            issueId: issue.id,
            type: "analysis",
            status: "working"
          }
        });

        if (existingSession) {
          return { sessionId: existingSession.sessionId, alreadyRunning: true };
        }

        // Create new Devin analysis session
        const sessionId = await devinClient.analyzeIssue(githubIssue);

        // Store session in database (use upsert to handle idempotent Devin responses)
        await db.devinSession.upsert({
          where: { sessionId },
          update: { 
            updatedAt: new Date() // Just update timestamp if session already exists
          },
          create: {
            sessionId,
            issueId: issue.id,
            type: "analysis",
            status: "working",
            messages: "[]", // Initialize with empty messages array (stringified)
          },
        });

        return { sessionId, alreadyRunning: false };
      } catch (error) {
        console.error("Error analyzing issue:", error);
        throw new Error("Failed to start analysis");
      }
    }),

  getSessionStatus: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log(`🔍 Polling session status for: ${input.sessionId}`);
        
        // Get session from Devin API
        const devinSession = await devinClient.getSession(input.sessionId);
        console.log(`📡 Devin API response:`, {
          sessionId: input.sessionId,
          status: devinSession.status,
          status_enum: devinSession.status_enum,
          hasStructuredOutput: !!devinSession.structured_output,
          structuredOutputType: typeof devinSession.structured_output
        });

        console.log("🔄 Devin Session Full:", devinSession);

        // Update session in database
        const dbSession = await db.devinSession.findUnique({
          where: { sessionId: input.sessionId },
          include: { issue: true }
        });

        if (!dbSession) {
          console.error(`❌ Session ${input.sessionId} not found in database`);
          throw new Error("Session not found in database");
        }

        let result = null;
        let confidenceScore = null;

        // If session is complete, process the structured output
        if (devinSession.status_enum && isDevinSessionComplete(devinSession.status_enum) && devinSession.structured_output) {
          console.log(`📝 Processing structured output for ${input.sessionId}:`, devinSession.structured_output);
          
          // structured_output is already an object, no JSON parsing needed
          const structuredResult: unknown = devinSession.structured_output;
          
          // Check if it's an analysis result or resolution result
          if (devinClient.isValidAnalysisResult(structuredResult)) {
            console.log(`✅ Valid analysis result found for ${input.sessionId}`);
            result = structuredResult;
            confidenceScore = structuredResult.confidence_score;
          } else if (devinClient.isValidResolutionResult(structuredResult)) {
            console.log(`✅ Valid resolution result found for ${input.sessionId}`);
            result = structuredResult;
          } else {
            console.warn(`⚠️ Unrecognized result format for ${input.sessionId}:`, structuredResult);
            result = structuredResult; // Store it anyway
          }
        }

        // Use status_enum directly in database, with fallback for null values
        const sessionStatus = devinSession.status_enum ?? "working";
        console.log(`🔄 Updating database status for ${input.sessionId}: ${sessionStatus} (original: ${devinSession.status_enum})`);

        // Update database with new status
        await db.devinSession.update({
          where: { sessionId: input.sessionId },
          data: {
            status: sessionStatus,
            result: result as Prisma.InputJsonValue,
            messages: devinSession.messages ? JSON.stringify(devinSession.messages) : undefined,
            confidenceScore,
            updatedAt: new Date(),
          },
        });

        const response = {
          ...devinSession,
          status_enum: sessionStatus, // Use the normalized status
          result,
          confidenceScore,
          issue: dbSession.issue,
        };

        console.log(`📤 Returning session status for ${input.sessionId}:`, {
          status: response.status,
          status_enum: response.status_enum,
          hasResult: !!response.result,
          issueNumber: dbSession.issue.number
        });

        return response;
      } catch (error) {
        console.error(`❌ Error getting session status for ${input.sessionId}:`, error);
        throw new Error("Failed to get session status");
      }
    }),

  resolveIssue: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      analysisResult: z.object({
        type: z.enum(["bug", "feature", "documentation", "enhancement", "maintenance", "question"]),
        complexity: z.enum(["low", "medium", "high"]),
        confidence_score: z.number().min(0).max(100),
        strategy: z.string(),
        scope_analysis: z.string(),
        reasoning: z.string(),
      })
    }))
    .mutation(async ({ input }) => {
      try {
        // Get the analysis session
        const analysisSession = await db.devinSession.findUnique({
          where: { sessionId: input.sessionId },
          include: { issue: true }
        });

        if (!analysisSession) {
          throw new Error("Analysis session not found");
        }

        // Check if there's already a running resolution session
        const existingResolutionSession = await db.devinSession.findFirst({
          where: {
            issueId: analysisSession.issue.id,
            type: "resolution",
            status: "working"
          }
        });

        if (existingResolutionSession) {
          return { sessionId: existingResolutionSession.sessionId, alreadyRunning: true };
        }

        // Get the GitHub issue details first to get the issue number
        const [owner, repo] = analysisSession.issue.repository.split("/");
        if (!owner || !repo) {
          throw new Error("Invalid repository format");
        }

        // Get the GitHub issue using the stored issue number
        const githubIssue = await githubClient.getIssue(
          owner,
          repo,
          analysisSession.issue.number
        );

        // Create resolution session
        const resolutionSessionId = await devinClient.resolveIssue(
          githubIssue,
          input.analysisResult
        );

        // Store resolution session in database (use upsert to handle idempotent Devin responses)
        await db.devinSession.upsert({
          where: { sessionId: resolutionSessionId },
          update: { 
            updatedAt: new Date() // Just update timestamp if session already exists
          },
          create: {
            sessionId: resolutionSessionId,
            issueId: analysisSession.issue.id,
            type: "resolution",
            status: "working",
            messages: "[]", // Initialize with empty messages array (stringified)
          },
        });

        return { sessionId: resolutionSessionId, alreadyRunning: false };
      } catch (error) {
        console.error("Error resolving issue:", error);
        throw new Error("Failed to start resolution");
      }
    }),

  getIssueWithSessions: publicProcedure
    .input(z.object({ 
      owner: z.string().min(1, "Owner is required"),
      repo: z.string().min(1, "Repository name is required"),
      issueNumber: z.number()
    }))
    .query(async ({ input }) => {
      try {
        // Get the GitHub issue
        const githubIssue = await githubClient.getIssue(
          input.owner,
          input.repo,
          input.issueNumber
        );

        // Get the issue from database with sessions
        const issue = await db.issue.findUnique({
          where: { githubId: BigInt(githubIssue.id) },
          include: {
            sessions: {
              orderBy: { createdAt: "desc" }
            }
          }
        });

        if (!issue) {
          throw new Error("Issue not found in database");
        }

        return {
          ...githubIssue,
          dbIssue: issue,
        };
      } catch (error) {
        console.error("Error getting issue with sessions:", error);
        throw new Error("Failed to get issue with sessions");
      }
    }),

  pollSession: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      maxAttempts: z.number().default(60),
      intervalMs: z.number().default(5000)
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await devinClient.pollSession(
          input.sessionId,
          input.maxAttempts,
          input.intervalMs
        );

        // Update the session in database
        await db.devinSession.update({
          where: { sessionId: input.sessionId },
          data: {
            status: isDevinSessionComplete(result.status_enum) ? "finished" : "expired",
            result: result.structured_output as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        });

        return result;
      } catch (error) {
        console.error("Error polling session:", error);
        
        // Mark session as failed
        await db.devinSession.update({
          where: { sessionId: input.sessionId },
          data: {
            status: "failed",
            updatedAt: new Date(),
          },
        });

        throw new Error("Session polling failed");
      }
    }),

  getAllSessions: publicProcedure
    .input(z.object({
      issueId: z.string().optional(),
      type: z.enum(["analysis", "resolution"]).optional(),
      status: z.enum(["running", "completed", "failed"]).optional(),
      limit: z.number().min(1).max(100).default(20)
    }))
    .query(async ({ input }) => {
      try {
        const sessions = await db.devinSession.findMany({
          where: {
            ...(input.issueId && { issueId: input.issueId }),
            ...(input.type && { type: input.type }),
            ...(input.status && { status: input.status }),
          },
          include: {
            issue: true,
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });

        return sessions;
      } catch (error) {
        console.error("Error getting sessions:", error);
        throw new Error("Failed to get sessions");
      }
    }),
});