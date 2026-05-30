export type ExperienceType = "work" | "education" | "certificate";

export interface ExperienceItem {
  id: string;
  type: ExperienceType;
  title: { es: string; en: string };
  organization: { es: string; en: string };
  period: string;
  description?: { es: string; en: string };
}

/**
 * Timeline de experiencia, estudios y certificados. Edita o añade entradas aquí.
 */
export const experienceItems: ExperienceItem[] = [
  {
    id: "edu-software",
    type: "education",
    title: { es: "Formación en Ingeniería de Software", en: "Software Engineering studies" },
    organization: { es: "Perú — Piura", en: "Peru — Piura" },
    period: "En curso",
    description: {
      es: "Base en desarrollo móvil, web y buenas prácticas de ingeniería de software.",
      en: "Foundation in mobile and web development plus software engineering best practices.",
    },
  },
  {
    id: "android-focus",
    type: "work",
    title: { es: "Desarrollo Android & Full-Stack", en: "Android & Full-Stack development" },
    organization: { es: "Proyectos personales y académicos", en: "Personal & academic projects" },
    period: "2022 — Actualidad",
    description: {
      es: "Apps Android (Kotlin/Java), frontends Vue/Nuxt y backends con Node y Python.",
      en: "Android apps (Kotlin/Java), Vue/Nuxt frontends, and Node/Python backends.",
    },
  },
  {
    id: "cert-github",
    type: "certificate",
    title: { es: "Logros GitHub: Pull Shark & YOLO", en: "GitHub achievements: Pull Shark & YOLO" },
    organization: { es: "GitHub", en: "GitHub" },
    period: "2024",
    description: {
      es: "Contribuciones en pull requests y merges de PR propias en repositorios públicos.",
      en: "Contributions via pull requests and merging your own PRs in public repositories.",
    },
  },
  {
    id: "cert-stack",
    type: "certificate",
    title: { es: "Stack web y diseño UI", en: "Web stack & UI design" },
    organization: { es: "Autodidacta — Figma, Firebase, Git", en: "Self-taught — Figma, Firebase, Git" },
    period: "2023 — Actualidad",
    description: {
      es: "Herramientas de diseño, control de versiones y despliegue de proyectos web.",
      en: "Design tools, version control, and deployment of web projects.",
    },
  },
];
