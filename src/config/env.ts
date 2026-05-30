/// <reference types="astro/client" />

const cvFilename = import.meta.env.PUBLIC_CV_FILENAME ?? "cv.pdf";

function assetUrl(path: string) {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\//, "")}`;
}

export const publicEnv = {
  baseUrl: import.meta.env.BASE_URL,
  githubUsername: import.meta.env.PUBLIC_GITHUB_USERNAME ?? "CesarEduL",
  cvFilename,
  cvUrl: assetUrl(cvFilename),
  web3formsAccessKey: import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY ?? "",
  contactEmail: import.meta.env.PUBLIC_CONTACT_EMAIL ?? "",
} as const;
