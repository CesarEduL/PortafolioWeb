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

/** Repo especial del README del perfil (mismo nombre que el usuario). */
export function isProfileReadmeRepo(repo: GitHubRepo, username: string): boolean {
  return repo.name.toLowerCase() === username.toLowerCase();
}

function isListableRepo(repo: GitHubRepo, username: string): boolean {
  if (repo.fork || repo.archived || repo.private) return false;
  if (isProfileReadmeRepo(repo, username)) return false;
  return true;
}

async function fetchAllUserRepos(username: string, headers: HeadersInit): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];
  let page = 1;

  while (page <= 10) {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=100&page=${page}`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`GitHub API respondió ${response.status}`);
    }

    const repos = (await response.json()) as GitHubRepo[];
    if (repos.length === 0) break;

    all.push(...repos);
    if (repos.length < 100) break;
    page += 1;
  }

  return all;
}

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
    const repos = await fetchAllUserRepos(username, headers);

    const filtered = repos
      .filter((repo) => isListableRepo(repo, username))
      .sort((a, b) => b.stargazers_count - a.stargazers_count);

    return filtered.length > 0 ? filtered : FALLBACK_REPOS;
  } catch (error) {
    console.warn("No se pudieron obtener repos de GitHub:", error);
    return FALLBACK_REPOS;
  }
}
