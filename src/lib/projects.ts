import type { FeaturedProject } from "../data/featured-projects";
import { repoDemoUrls } from "../data/repo-demo-urls";
import type { GitHubRepo } from "./github";
import { assetUrl } from "./assets";

export interface EnrichedFeaturedProject extends FeaturedProject {
  html_url: string;
  liveUrl?: string;
  siteUrl?: string;
  imageUrl: string;
}

/** Solo se muestran entradas cuyo repo existe en GitHub (o `isCurrentSite`). */
function isFeaturedVisible(project: FeaturedProject, repoNames: Set<string>): boolean {
  if (project.enabled === false) return false;
  if (project.isCurrentSite) return true;
  return repoNames.has(project.githubRepo.toLowerCase());
}

export function enrichFeaturedProjects(
  projects: FeaturedProject[],
  repos: GitHubRepo[],
  githubUsername: string,
): EnrichedFeaturedProject[] {
  const repoNames = new Set(repos.map((r) => r.name.toLowerCase()));

  return projects.filter((p) => isFeaturedVisible(p, repoNames)).map((project) => {
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

/** Aplica demos manuales (p. ej. GX Store) cuando el repo no tiene homepage en GitHub. */
export function applyRepoDemoUrls(repos: GitHubRepo[]): GitHubRepo[] {
  return repos.map((repo) => {
    const demo = repoDemoUrls[repo.name.toLowerCase()];
    if (!demo) return repo;
    return { ...repo, homepage: demo };
  });
}
