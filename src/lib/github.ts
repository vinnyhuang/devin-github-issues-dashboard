import { Octokit } from "@octokit/rest";
import { env } from "@/env";
import type { GitHubIssue, GitHubRepository } from "./types";

class GitHubClient {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN,
    });
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo,
    });

    return data as GitHubRepository;
  }

  async getIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
    per_page = 30,
    page = 1
  ): Promise<GitHubIssue[]> {
    console.log('getIssues', owner, repo, state, per_page, page);
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      per_page,
      page,
      sort: "created",
      direction: "desc",
    });

    return data.map((issue) => ({
      ...issue,
      repository_url: `https://github.com/${owner}/${repo}`,
    })) as GitHubIssue[];
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return {
      ...data,
      repository_url: `https://github.com/${owner}/${repo}`,
    } as GitHubIssue;
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base = "main"
  ) {
    const { data } = await this.octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
    });

    return data;
  }

  async addIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ) {
    const { data } = await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });

    return data;
  }

  parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const match = /github\.com\/([^\/]+)\/([^\/]+)/.exec(url);
    if (!match) return null;
    
    return {
      owner: match[1]!,
      repo: match[2]!.replace(/\.git$/, ""),
    };
  }

  getRepoUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}`;
  }
}

export const githubClient = new GitHubClient();
export default GitHubClient;