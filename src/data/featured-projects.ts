export interface FeaturedProject {
  id: string;
  /** Nombre del repo en GitHub. Si ya no existe, no se muestra (salvo `isCurrentSite`). */
  githubRepo: string;
  title: string;
  description: { es: string; en: string };
  stack: string[];
  demoUrl?: string;
  /** Enlace al sitio actual (ej. este portafolio). Muestra «Este Proyecto» en vez de demo. */
  isCurrentSite?: boolean;
  /** `false` oculta aunque el repo exista. Por defecto: visible solo si el repo existe. */
  enabled?: boolean;
  /** Ruta bajo public/, ej. projects/alertadolar.png */
  image: string;
  /** Color hex del degradado si la captura no carga (opcional; si no, se infiere del stack). */
  imageAccent?: string;
}

/**
 * Catálogo de proyectos destacados. En build se filtran contra la API de GitHub:
 * solo aparecen si `githubRepo` existe en tu cuenta (o `isCurrentSite: true`).
 * Añade una entrada nueva aquí cuando publiques un repo; no hace falta borrar las viejas.
 */
export const featuredProjects: FeaturedProject[] = [
  {
    id: "alertadolar",
    githubRepo: "AlertaDolar",
    title: "AlertaDolar",
    description: {
      es: "App Android para consultar tipos de cambio y recibir alertas. Arquitectura modular y consumo de APIs en tiempo real.",
      en: "Android app to check exchange rates and receive alerts. Modular architecture with real-time API consumption.",
    },
    stack: ["Kotlin", "Android", "REST", "Firebase"],
    image: "projects/alertadolar.svg",
  },
  {
    id: "news-web-taller",
    githubRepo: "news-web-taller",
    title: "News Web Taller",
    description: {
      es: "Práctica de Vue 3 con Vite: noticias, Vue Router, Vuex, Axios y pruebas con Vitest. Versión de taller del proyecto news-web.",
      en: "Vue 3 + Vite practice app: news feed, Vue Router, Vuex, Axios, and Vitest unit tests. Workshop edition of the news-web project.",
    },
    stack: ["Vue", "Vite", "Vuex", "Vitest"],
    image: "projects/news-web-taller.svg",
    imageAccent: "#1b5e20",
  },
  {
    id: "portafolio",
    githubRepo: "PortafolioWeb",
    title: "Portafolio Web",
    description: {
      es: "Este sitio: Astro estático, integración con GitHub, i18n, blog y despliegue en GitHub Pages.",
      en: "This site: static Astro, GitHub integration, i18n, blog, and GitHub Pages deployment.",
    },
    stack: ["Astro", "Tailwind", "TypeScript", "GitHub Actions"],
    isCurrentSite: true,
    image: "projects/portafolio.svg",
  },
];
