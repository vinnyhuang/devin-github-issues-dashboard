import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { githubClient } from "@/lib/github";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const githubRouter = createTRPCRouter({
  getRepository: publicProcedure
    .input(z.object({ 
      owner: z.string().min(1, "Owner is required"),
      repo: z.string().min(1, "Repository name is required")
    }))
    .query(async ({ input }) => {
      try {
        const repository = await githubClient.getRepository(input.owner, input.repo);
        return repository;
      } catch (error) {
        console.error("Error fetching repository:", error);
        
        if (error && typeof error === "object" && "status" in error) {
          const httpError = error as { status: number; message?: string };
          if (httpError.status === 404) {
            throw new Error(`Repository ${input.owner}/${input.repo} not found. Please check the repository name and ensure it's public.`);
          } else if (httpError.status === 403) {
            throw new Error("Access denied. Please check your GitHub token permissions.");
          } else if (httpError.status === 401) {
            throw new Error("GitHub authentication failed. Please check your GitHub token.");
          }
        }
        
        throw new Error("Failed to fetch repository. Please try again.");
      }
    }),

  getIssues: publicProcedure
    .input(z.object({ 
      owner: z.string().min(1, "Owner is required"),
      repo: z.string().min(1, "Repository name is required"),
      state: z.enum(["open", "closed", "all"]).default("open"),
      per_page: z.number().min(1).max(100).default(30),
      page: z.number().min(1).default(1)
    }))
    .query(async ({ input }) => {
      try {
        const issues = await githubClient.getIssues(
          input.owner,
          input.repo,
          input.state,
          input.per_page,
          input.page
        );

        // Store issues in database for session tracking
        const repository = `${input.owner}/${input.repo}`;
        
        for (const issue of issues) {
          await db.issue.upsert({
            where: { githubId: BigInt(issue.id) },
            update: {
              number: issue.number,
              title: issue.title,
              body: issue.body,
              url: issue.html_url,
              state: issue.state,
              labels: issue.labels as unknown as Prisma.InputJsonValue,
              repository,
              updatedAt: new Date(),
            },
            create: {
              githubId: BigInt(issue.id),
              number: issue.number,
              title: issue.title,
              body: issue.body,
              url: issue.html_url,
              state: issue.state,
              labels: issue.labels as unknown as Prisma.InputJsonValue,
              repository,
            },
          });
        }

        return issues;
      } catch (error) {
        console.error("Error fetching issues:", error);
        
        if (error && typeof error === "object" && "status" in error) {
          const httpError = error as { status: number; message?: string };
          if (httpError.status === 404) {
            throw new Error(`Repository ${input.owner}/${input.repo} not found. Please check the repository name and ensure it's public.`);
          } else if (httpError.status === 403) {
            throw new Error("Access denied. Please check your GitHub token permissions.");
          } else if (httpError.status === 401) {
            throw new Error("GitHub authentication failed. Please check your GitHub token.");
          }
        }
        
        throw new Error("Failed to fetch issues. Please try again.");
      }
    }),

  getIssue: publicProcedure
    .input(z.object({ 
      owner: z.string().min(1, "Owner is required"),
      repo: z.string().min(1, "Repository name is required"),
      issueNumber: z.number()
    }))
    .query(async ({ input }) => {
      try {
        const issue = await githubClient.getIssue(
          input.owner,
          input.repo,
          input.issueNumber
        );

        // Store issue in database
        const repository = `${input.owner}/${input.repo}`;
        
        await db.issue.upsert({
          where: { githubId: BigInt(issue.id) },
          update: {
            number: issue.number,
            title: issue.title,
            body: issue.body,
            url: issue.html_url,
            state: issue.state,
            labels: issue.labels as unknown as Prisma.InputJsonValue,
            repository,
            updatedAt: new Date(),
          },
          create: {
            githubId: BigInt(issue.id),
            number: issue.number,
            title: issue.title,
            body: issue.body,
            url: issue.html_url,
            state: issue.state,
            labels: issue.labels as unknown as Prisma.InputJsonValue,
            repository,
          },
        });

        return issue;
      } catch (error) {
        console.error("Error fetching issue:", error);
        throw new Error("Failed to fetch issue");
      }
    }),

  parseRepoUrl: publicProcedure
    .input(z.object({ url: z.string() }))
    .query(({ input }) => {
      const parsed = githubClient.parseRepoUrl(input.url);
      if (!parsed) {
        throw new Error("Invalid GitHub repository URL");
      }
      return parsed;
    }),

  createPullRequest: publicProcedure
    .input(z.object({
      owner: z.string().min(1, "Owner is required"),
      repo: z.string().min(1, "Repository name is required"),
      title: z.string(),
      body: z.string(),
      head: z.string(),
      base: z.string().default("main")
    }))
    .mutation(async ({ input }) => {
      try {
        const pr = await githubClient.createPullRequest(
          input.owner,
          input.repo,
          input.title,
          input.body,
          input.head,
          input.base
        );
        return pr;
      } catch (error) {
        console.error("Error creating pull request:", error);
        throw new Error("Failed to create pull request");
      }
    }),

  addComment: publicProcedure
    .input(z.object({
      owner: z.string().min(1, "Owner is required"),
      repo: z.string().min(1, "Repository name is required"),
      issueNumber: z.number(),
      body: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        const comment = await githubClient.addIssueComment(
          input.owner,
          input.repo,
          input.issueNumber,
          input.body
        );
        return comment;
      } catch (error) {
        console.error("Error adding comment:", error);
        throw new Error("Failed to add comment");
      }
    }),
});