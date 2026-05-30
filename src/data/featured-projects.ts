export interface FeaturedProject {
  id: string;
  githubRepo: string;
  title: string;
  description: { es: string; en: string };
  stack: string[];
  demoUrl?: string;
  /** Enlace al sitio actual (ej. este portafolio). Muestra «Este Proyecto» en vez de demo. */
  isCurrentSite?: boolean;
  /** Ruta bajo public/, ej. projects/alertadolar.png */
  image: string;
}

/**
 * Proyectos destacados (3–4). Edita textos, stack, demo e imágenes aquí.
 * Capturas: coloca PNG/WebP en public/projects/ con el mismo nombre base.
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
    id: "refugio",
    githubRepo: "RefugioApp",
    title: "Refugio App",
    description: {
      es: "Aplicación orientada a gestión y visibilidad de refugios. Enfoque en usabilidad y persistencia de datos.",
      en: "App focused on shelter management and visibility. Emphasis on usability and data persistence.",
    },
    stack: ["Java", "Android", "SQLite", "Material Design"],
    image: "projects/refugio.svg",
  },
  {
    id: "storybook-nuxt",
    githubRepo: "Storybook-Nuxt",
    title: "Storybook + Nuxt",
    description: {
      es: "Catálogo de componentes UI documentados con Storybook en un proyecto Nuxt. Ideal para diseño consistente en equipos.",
      en: "UI component catalog documented with Storybook in a Nuxt project. Built for consistent team design systems.",
    },
    stack: ["Vue", "Nuxt", "Storybook", "TypeScript"],
    demoUrl: undefined,
    image: "projects/storybook-nuxt.svg",
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
