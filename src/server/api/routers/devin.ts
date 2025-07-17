import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { devinClientInstance as devinClient } from "@/lib/devin-factory";
import { githubClient } from "@/lib/github";
import { db } from "@/server/db";
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
            status: "running"
          }
        });

        if (existingSession) {
          return { sessionId: existingSession.sessionId, alreadyRunning: true };
        }

        // Create new Devin analysis session
        const sessionId = await devinClient.analyzeIssue(githubIssue);

        // Store session in database
        await db.devinSession.create({
          data: {
            sessionId,
            issueId: issue.id,
            type: "analysis",
            status: "running",
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
          structuredOutputLength: devinSession.structured_output?.length || 0
        });

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

        // If session is complete, parse the structured output
        if ((devinSession.status === "stopped" || devinSession.status === "blocked") && devinSession.structured_output) {
          console.log(`📝 Parsing structured output for ${input.sessionId}:`, devinSession.structured_output.substring(0, 200) + "...");
          try {
            const parsedResult: unknown = JSON.parse(devinSession.structured_output);
            
            // Check if it's an analysis result or resolution result
            if (devinClient.isValidAnalysisResult(parsedResult)) {
              console.log(`✅ Valid analysis result parsed for ${input.sessionId}`);
              result = parsedResult;
              confidenceScore = parsedResult.confidence_score;
            } else if (devinClient.isValidResolutionResult(parsedResult)) {
              console.log(`✅ Valid resolution result parsed for ${input.sessionId}`);
              result = parsedResult;
            } else {
              console.warn(`⚠️ Unrecognized result format for ${input.sessionId}:`, parsedResult);
              result = parsedResult; // Store it anyway
            }
          } catch (parseError) {
            console.error(`❌ Error parsing structured output for ${input.sessionId}:`, parseError);
          }
        }

        // Map status: both "stopped" and "blocked" should be treated as completed
        const mappedStatus = (devinSession.status === "stopped" || devinSession.status === "blocked") ? "completed" : "running";
        console.log(`🔄 Updating database status for ${input.sessionId}: ${devinSession.status} → ${mappedStatus}`);

        // Update database with new status
        await db.devinSession.update({
          where: { sessionId: input.sessionId },
          data: {
            status: mappedStatus,
            result: result as unknown as Prisma.InputJsonValue,
            confidenceScore,
            updatedAt: new Date(),
          },
        });

        const response = {
          ...devinSession,
          result,
          confidenceScore,
          issue: dbSession.issue,
        };

        console.log(`📤 Returning session status for ${input.sessionId}:`, {
          status: response.status,
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

        // Store resolution session in database
        await db.devinSession.create({
          data: {
            sessionId: resolutionSessionId,
            issueId: analysisSession.issue.id,
            type: "resolution",
            status: "running",
          },
        });

        return { sessionId: resolutionSessionId };
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
            status: result.status === "stopped" ? "completed" : "failed",
            result: result.structured_output ? JSON.parse(result.structured_output) as unknown as Prisma.InputJsonValue : undefined,
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