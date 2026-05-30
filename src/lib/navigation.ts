import { assetUrl } from "./assets";

/** Rutas del sitio (respetan BASE_PATH). */
export const routes = {
  home: assetUrl(""),
  about: `${assetUrl("")}#sobre-mi`,
  tech: `${assetUrl("")}#tecnologias`,
  contact: `${assetUrl("")}#contacto`,
  projects: assetUrl("proyectos/"),
  experience: assetUrl("experiencia/"),
  blog: assetUrl("blog/"),
  stats: assetUrl("estadisticas/"),
} as const;

export type RouteId = "home" | "projects" | "experience" | "blog" | "stats";

/** Identifica la sección/página activa a partir del pathname. */
export function getActiveRoute(pathname: string, basePath: string): RouteId {
  const base = basePath.replace(/\/$/, "");
  let path = pathname;
  if (base && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  path = path.replace(/^\/+|\/+$/g, "");
  if (!path || path === "index.html") return "home";

  const segment = path.split("/")[0];
  if (segment === "proyectos") return "projects";
  if (segment === "experiencia") return "experience";
  if (segment === "blog") return "blog";
  if (segment === "estadisticas") return "stats";
  return "home";
}

export interface NavLink {
  href: string;
  key: keyof typeof import("../i18n/ui").ui.es;
  routeId?: RouteId;
}

/** Enlaces principales → páginas dedicadas. */
export const navPrimary: NavLink[] = [
  { href: routes.home, key: "nav.home", routeId: "home" },
  { href: routes.projects, key: "nav.projects", routeId: "projects" },
  { href: routes.experience, key: "nav.experience", routeId: "experience" },
  { href: routes.blog, key: "nav.blog", routeId: "blog" },
];

/** Enlaces secundarios → anclas en inicio o página de stats. */
export const navSecondary: NavLink[] = [
  { href: routes.about, key: "nav.about" },
  { href: routes.tech, key: "nav.tech" },
  { href: routes.stats, key: "nav.stats", routeId: "stats" },
];
