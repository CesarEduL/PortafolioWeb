export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
  private: boolean;
}

const FALLBACK_REPOS: GitHubRepo[] = [
  {
    id: 1,
    name: "Portfolio_v2",
    description: "Personal portfolio built with modern web technologies and a sleek dark theme.",
    html_url: "https://github.com/CesarEduL",
    homepage: null,
    language: "Vue",
    stargazers_count: 0,
    fork: false,
    archived: false,
    private: false,
  },
];

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const token = import.meta.env.GH_API_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=12`,
      { headers },
    );

    if (!response.ok) {
      console.warn(`GitHub API respondió ${response.status}. Usando repos de respaldo.`);
      return FALLBACK_REPOS;
    }

    const repos = (await response.json()) as GitHubRepo[];

    const filtered = repos
      .filter((repo) => !repo.fork && !repo.archived && !repo.private)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 6);

    return filtered.length > 0 ? filtered : FALLBACK_REPOS;
  } catch (error) {
    console.warn("No se pudieron obtener repos de GitHub:", error);
    return FALLBACK_REPOS;
  }
}
