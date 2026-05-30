/** Normaliza el id de Astro Content (p. ej. `post.md` → `post`). */
export function blogSlug(id: string): string {
  return id.replace(/\.mdx?$/, "");
}

export function blogPostUrl(id: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}blog/${blogSlug(id)}/`;
}
