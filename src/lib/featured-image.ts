import type { FeaturedProject } from "../data/featured-projects";

/** Color final del degradado del fallback (cuando la imagen no carga). */
const ACCENT_BY_KEY: Record<string, string> = {
  kotlin: "#283593",
  android: "#283593",
  java: "#2e7d32",
  vue: "#1b5e20",
  nuxt: "#1b5e20",
  astro: "#00695c",
  tailwind: "#00695c",
  typescript: "#1565c0",
  python: "#4a148c",
  default: "#3949ab",
};

export function getFeaturedImageAccent(project: FeaturedProject): string {
  if (project.imageAccent) return project.imageAccent;

  for (const tech of project.stack) {
    const key = tech.toLowerCase();
    if (ACCENT_BY_KEY[key]) return ACCENT_BY_KEY[key];
  }

  return ACCENT_BY_KEY.default;
}

export function getFeaturedImageStackLabel(stack: string[]): string {
  return stack.slice(0, 4).join(" · ");
}
