export type ExperienceType = "work" | "education" | "certificate";

export interface ExperienceItem {
  id: string;
  type: ExperienceType;
  title: { es: string; en: string };
  organization: { es: string; en: string };
  period?: string;
  description?: { es: string; en: string };
  /** Enlace al PDF (Google Drive u otro). Solo en certificados. */
  documentUrl?: string;
}

/**
 * Timeline de experiencia, estudios y certificados. Edita o añade entradas aquí.
 * documentUrl: el PDF debe estar en «Cualquier persona con el enlace» en Drive.
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
    id: "cert-js-google",
    type: "certificate",
    title: { es: "Taller de JavaScript — Básico", en: "JavaScript Workshop — Basic" },
    organization: { es: "Google", en: "Google" },
    description: {
      es: "Fundamentos de JavaScript aplicados al desarrollo web.",
      en: "JavaScript fundamentals applied to web development.",
    },
    documentUrl:
      "https://drive.google.com/file/d/1fxqRgOT8mTYIBp3Z6oLXpAXkEJUI5D_Q/view?usp=drive_link",
  },
  {
    id: "cert-js-utp",
    type: "certificate",
    title: { es: "Taller de JavaScript — Básico", en: "JavaScript Workshop — Basic" },
    organization: { es: "Universidad Tecnológica del Perú (UTP)", en: "UTP — Technological University of Peru" },
    description: {
      es: "Sintaxis, lógica y buenas prácticas iniciales en JavaScript.",
      en: "Syntax, logic, and introductory best practices in JavaScript.",
    },
    documentUrl:
      "https://drive.google.com/file/d/1MH8vJvMfOf5WwmQQ-VEBLF2UR4rgcj_E/view?usp=drive_link",
  },
  {
    id: "cert-soporte-tecnico",
    type: "certificate",
    title: { es: "Especialista de soporte técnico", en: "Technical Support Specialist" },
    organization: { es: "Certificación profesional", en: "Professional certification" },
    description: {
      es: "Diagnóstico, resolución de incidencias y atención de infraestructura TI.",
      en: "Troubleshooting, incident resolution, and IT infrastructure support.",
    },
    documentUrl:
      "https://drive.google.com/file/d/1MTGTaRDVqq8E1Wv6tZ9Y5r019lYy9uqb/view?usp=drive_link",
  },
  {
    id: "cert-ingles-intermedio",
    type: "certificate",
    title: { es: "Inglés Intermedio", en: "Intermediate English" },
    organization: { es: "Certificación de idiomas", en: "Language certification" },
    description: {
      es: "Comunicación técnica y profesional en entornos internacionales.",
      en: "Technical and professional communication in international settings.",
    },
    documentUrl:
      "https://drive.google.com/file/d/1MfJS57eHvmii58nyDqYSujM9wIf-MWkP/view?usp=drive_link",
  },
  {
    id: "cert-business-meetings",
    type: "certificate",
    title: {
      es: "Leading and participating successfully in business meetings",
      en: "Leading and participating successfully in business meetings",
    },
    organization: { es: "Certificación de inglés profesional", en: "Professional English certification" },
    description: {
      es: "Participación y liderazgo en reuniones de negocio en inglés.",
      en: "Leading and taking part in business meetings in English.",
    },
    documentUrl:
      "https://drive.google.com/file/d/1uz7I2fqb5bRwXvbKZ4pGUVnNKVvKxiAo/view?usp=drive_link",
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
];
