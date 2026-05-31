/** Espejos comunitarios (el servicio principal suele estar inestable). */
export const GITHUB_TROPHY_HOSTS = [
  "https://gh-trophy.cdnsoft.net",
  "https://trophy.ryglcloud.net",
  "https://github-profile-trophy-fork-two.vercel.app",
  "https://github-profile-trophy-liard-delta.vercel.app",
  "https://github-profile-trophy-sigma-one.vercel.app",
  "https://github-profile-trophy.vercel.app",
] as const;

function trophySearchParams(username: string) {
  return new URLSearchParams({
    username,
    theme: "discord",
    "no-frame": "true",
    column: "4",
    "margin-w": "8",
    "margin-h": "8",
  });
}

export function getGitHubTrophyUrl(username: string, hostIndex = 0): string {
  const host = GITHUB_TROPHY_HOSTS[hostIndex] ?? GITHUB_TROPHY_HOSTS[0];
  return `${host}/?${trophySearchParams(username).toString()}`;
}

export function getGitHubTrophyFallbackUrls(username: string): string[] {
  return GITHUB_TROPHY_HOSTS.slice(1).map((_, index) => getGitHubTrophyUrl(username, index + 1));
}

/** Intenta obtener el SVG en build; si falla, devuelve URL remota + espejos. */
export async function resolveGitHubTrophySrc(
  username: string,
): Promise<{ src: string; fallbacks: string[] }> {
  const urls = GITHUB_TROPHY_HOSTS.map((_, index) => getGitHubTrophyUrl(username, index));

  for (let index = 0; index < urls.length; index++) {
    const url = urls[index];
    try {
      const response = await fetch(url, {
        headers: { Accept: "image/svg+xml,text/plain,*/*" },
        signal: AbortSignal.timeout(25_000),
      });

      if (!response.ok) continue;

      const body = await response.text();
      if (!body.trimStart().startsWith("<svg")) continue;

      const encoded = Buffer.from(body, "utf-8").toString("base64");
      return {
        src: `data:image/svg+xml;base64,${encoded}`,
        fallbacks: urls.filter((_, i) => i !== index),
      };
    } catch (error) {
      console.warn(`[trophy] Error al obtener ${url}:`, error);
    }
  }

  console.warn("[trophy] Usando URL remota; los espejos se probarán en el navegador.");
  return { src: urls[0], fallbacks: urls.slice(1) };
}
