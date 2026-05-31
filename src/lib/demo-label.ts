const MOBILE_STACK = new Set(["android", "flutter"]);

export function isApkDemoUrl(url: string): boolean {
  return /\.apk(\?|#|$)/i.test(url);
}

export function isApkDemoFromStack(stack: string[]): boolean {
  return stack.some((tech) => MOBILE_STACK.has(tech.toLowerCase()));
}

/** Repos sin stack: Kotlin/Dart + enlace de demo suelen ser apps móviles. */
export function isApkDemoFromRepo(language: string | null, homepage: string | null): boolean {
  if (!homepage) return false;
  if (isApkDemoUrl(homepage)) return true;
  const lang = language?.toLowerCase();
  return lang === "kotlin" || lang === "dart";
}

export function isApkDemo(options: {
  stack?: string[];
  demoUrl?: string | null;
  language?: string | null;
}): boolean {
  if (options.stack?.length && isApkDemoFromStack(options.stack)) return true;
  if (options.demoUrl && isApkDemoUrl(options.demoUrl)) return true;
  if (options.demoUrl) {
    return isApkDemoFromRepo(options.language ?? null, options.demoUrl);
  }
  return false;
}
