/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_GITHUB_USERNAME?: string;
  readonly PUBLIC_CV_FILENAME?: string;
  readonly PUBLIC_WEB3FORMS_ACCESS_KEY?: string;
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly GH_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
