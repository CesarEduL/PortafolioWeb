export const siteConfig = {
  name: "Cesar Eduardo",
  title: "Cesar Eduardo - Portfolio",
  role: "Android Developer | Software Developer",
  available: true,
  githubUsername: import.meta.env.PUBLIC_GITHUB_USERNAME ?? "cesaredul",
  linkedinUrl: "https://www.linkedin.com/in/cesareduardo",
  githubUrl: "https://github.com/cesaredul",
  cvUrl: "#",
  profileImage:
    "https://lh3.googleusercontent.com/aida/ADBb0uiHWATUSx5pv61VXJJaEj-s2fioOgfFcKe3ABFNLu9w5Xzy6yFp9RiMhDCh6qcMjPvJ9eK7ZJnM7LKPS549vkIJiH1HFyhGbzZavO8yiyNqqx2sxGxcIaFFWxIXzBdkROTlHK6e8HfD7o6ViM1YJsmoI-2nt9g9PIbA6W1eXtZHazlof0r3Q--b3_2IFj4VIiXcnmRPRMJRYvDA12e5x2Uk5c0zWhqx4ockKq6eErp3tHv72SRMqHfL5us",
  skillsImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDlhwXYGVp9xEOEcQ6ytumF0cAx92CO6oI-rusL86M8NNauPLeMG3vAvvg7ZymUJjpj7YqAVUq9MuJaFq2d7Btw_4C2el1Dfgq9aUEvdkRnCxREjSc_W9G0HbRUiPgZKfDsRbQES7afKEwZGsJFKaZIlSfMJ431NDiRvzojH96Oy6lrZwXei2D4akcrYqLNbkjDlfyPwtArXQJdiwSKC1YURBC_4g_c7RE2fTCOaofFRzdhjFDQk9Hn5Vy0TZu4VVtoOLkkJNMtsF4",
  contactImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC4cB4I2Tp2hvSq90NXb6hq72_ofgcUp1i53FzNpt8zzMIK-hk-jAIP-9AoyRFsCSfGHEUtW3DeWPi3rWgTb_XfFB6s_fduFAc2IBMwL9NCSYbKVr77jNiID13RyFX2OcrNOOxAr5oNVDbbcm6ZqWO5Z76vD2CuMBeD_6_1cgiQFl6Nh8Q3A6fv5GYJ0UjsXCxOlcz7zg9IdUNHyS3RvhIMj3-bO1h5uWOeVC2cAUA6EQsV-OthQ4XAJIhiypdLA349jopQLh_kfsI",
  web3formsAccessKey: import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY ?? "",
  contactEmail: import.meta.env.PUBLIC_CONTACT_EMAIL ?? "",
};

export function getGitHubStatsUrl(username: string) {
  const params = new URLSearchParams({
    username,
    show_icons: "true",
    theme: "tokyonight",
    hide_border: "true",
    bg_color: "12131d",
  });
  return `https://github-readme-stats.vercel.app/api?${params.toString()}`;
}

export function getGitHubStreakUrl(username: string) {
  const params = new URLSearchParams({
    user: username,
    theme: "tokyonight",
    hide_border: "true",
    background: "12131D",
  });
  return `https://github-readme-streak-stats.demolab.com/?${params.toString()}`;
}
