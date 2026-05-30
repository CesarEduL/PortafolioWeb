import type { FeaturedProject } from "../data/featured-projects";
import type { GitHubRepo } from "./github";
import { assetUrl } from "./assets";

export interface EnrichedFeaturedProject extends FeaturedProject {
  html_url: string;
  liveUrl?: string;
  siteUrl?: string;
  imageUrl: string;
}

export function enrichFeaturedProjects(
  projects: FeaturedProject[],
  repos: GitHubRepo[],
  githubUsername: string,
): EnrichedFeaturedProject[] {
  return projects.map((project) => {
    const repo = repos.find((r) => r.name.toLowerCase() === project.githubRepo.toLowerCase());
    const html_url = repo?.html_url ?? `https://github.com/${githubUsername}/${project.githubRepo}`;
    const liveUrl = project.demoUrl ?? repo?.homepage ?? undefined;

    return {
      ...project,
      html_url,
      liveUrl: liveUrl || undefined,
      siteUrl: project.isCurrentSite ? assetUrl("") : undefined,
      imageUrl: assetUrl(project.image),
    };
  });
}

export function excludeFeaturedRepos(repos: GitHubRepo[], featured: FeaturedProject[]): GitHubRepo[] {
  const names = new Set(featured.map((p) => p.githubRepo.toLowerCase()));
  return repos.filter((r) => !names.has(r.name.toLowerCase()));
}
