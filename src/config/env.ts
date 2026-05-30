/// <reference types="astro/client" />

import { assetUrl } from "../lib/assets";

const cvFilename = import.meta.env.PUBLIC_CV_FILENAME ?? "cv.pdf";

export const publicEnv = {
  baseUrl: import.meta.env.BASE_URL,
  githubUsername: import.meta.env.PUBLIC_GITHUB_USERNAME ?? "CesarEduL",
  cvFilename,
  cvUrl: assetUrl(cvFilename),
  web3formsAccessKey: import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY ?? "",
  contactEmail: import.meta.env.PUBLIC_CONTACT_EMAIL ?? "",
  plausibleDomain: import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN ?? "",
  umamiWebsiteId: import.meta.env.PUBLIC_UMAMI_WEBSITE_ID ?? "",
  umamiScriptUrl:
    import.meta.env.PUBLIC_UMAMI_SCRIPT_URL ?? "https://cloud.umami.is/script.js",
} as const;
