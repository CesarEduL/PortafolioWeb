import { publicEnv } from "./env";

export const siteConfig = {
  name: "Cesar Eduardo",
  title: "Cesar Eduardo - Portfolio",
  /** Ícono de pestaña del navegador */
  faviconUrl:
    "https://res.cloudinary.com/drcphk36t/image/upload/q_auto/f_auto/v1780219303/logo_sin_fondo_circulo_qy2gjr.png",
  /** Logo horizontal del header (reemplaza el texto del nombre) */
  logoUrl:
    "https://res.cloudinary.com/drcphk36t/image/upload/q_auto/f_auto/v1780218876/logo_completo_de_lado_sin_fondo_vwc76r.png",
  role: "Android Developer | Software Developer",
  available: true,
  githubUsername: publicEnv.githubUsername,
  linkedinUrl: "https://www.linkedin.com/in/cesar-camero",
  githubUrl: "https://github.com/CesarEduL",
  cvUrl: publicEnv.cvUrl,
  profileImage:
    "https://lh3.googleusercontent.com/aida/ADBb0uiHWATUSx5pv61VXJJaEj-s2fioOgfFcKe3ABFNLu9w5Xzy6yFp9RiMhDCh6qcMjPvJ9eK7ZJnM7LKPS549vkIJiH1HFyhGbzZavO8yiyNqqx2sxGxcIaFFWxIXzBdkROTlHK6e8HfD7o6ViM1YJsmoI-2nt9g9PIbA6W1eXtZHazlof0r3Q--b3_2IFj4VIiXcnmRPRMJRYvDA12e5x2Uk5c0zWhqx4ockKq6eErp3tHv72SRMqHfL5us",
  contactImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC4cB4I2Tp2hvSq90NXb6hq72_ofgcUp1i53FzNpt8zzMIK-hk-jAIP-9AoyRFsCSfGHEUtW3DeWPi3rWgTb_XfFB6s_fduFAc2IBMwL9NCSYbKVr77jNiID13RyFX2OcrNOOxAr5oNVDbbcm6ZqWO5Z76vD2CuMBeD_6_1cgiQFl6Nh8Q3A6fv5GYJ0UjsXCxOlcz7zg9IdUNHyS3RvhIMj3-bO1h5uWOeVC2cAUA6EQsV-OthQ4XAJIhiypdLA349jopQLh_kfsI",
  web3formsAccessKey: publicEnv.web3formsAccessKey,
  contactEmail: publicEnv.contactEmail,
};

const GITHUB_STATS_HOSTS = [
  "https://github-readme-stats.anuraghazra1.vercel.app",
  "https://github-readme-stats.vercel.app",
] as const;

function buildGitHubStatsUrl(host: string, username: string) {
  const params = new URLSearchParams({
    username,
    show_icons: "true",
    theme: "tokyonight",
    hide_border: "true",
    include_all_commits: "true",
  });
  return `${host}/api?${params.toString()}`;
}

/** Tarjeta principal (repos, estrellas, commits). Sin count_private: requiere PAT y suele romper la imagen. */
export function getGitHubStatsUrl(username: string) {
  return buildGitHubStatsUrl(GITHUB_STATS_HOSTS[0], username);
}

export function getGitHubStatsFallbackUrl(username: string) {
  return buildGitHubStatsUrl(GITHUB_STATS_HOSTS[1], username);
}

/** Lenguajes más usados (como en tu README de GitHub). */
export function getGitHubTopLangsUrl(username: string) {
  const params = new URLSearchParams({
    username,
    theme: "tokyonight",
    hide_border: "true",
    layout: "compact",
    langs_count: "8",
  });
  return `${GITHUB_STATS_HOSTS[0]}/api/top-langs/?${params.toString()}`;
}

export function getGitHubTrophyUrl(username: string) {
  const params = new URLSearchParams({
    username,
    theme: "discord",
    "no-frame": "true",
    column: "4",
    "margin-w": "8",
    "margin-h": "8",
  });
  return `https://github-profile-trophy.vercel.app/?${params.toString()}`;
}

export function getGitHubStreakUrl(username: string) {
  const params = new URLSearchParams({
    user: username,
    theme: "tokyonight",
    hide_border: "true",
  });
  return `https://streak-stats.demolab.com/?${params.toString()}`;
}

const SKILL_ICONS =
  "androidstudio,blender,c,cs,cpp,css,figma,firebase,git,html,java,javascript,mysql,ps,php,sass,vue,nuxtjs,vscode,flask,flutter,gitlab,postgres,godot,nodejs,python,vite,vuetify";

export function getSkillsIconsUrl() {
  const params = new URLSearchParams({
    i: SKILL_ICONS,
    theme: "dark",
  });
  return `https://skillicons.dev/icons?${params.toString()}`;
}
