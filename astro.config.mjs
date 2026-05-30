import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

const basePath = process.env.BASE_PATH ?? "/PortafolioWeb";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://cesaredul.github.io",
  base: basePath,
  integrations: [tailwind({ applyBaseStyles: false })],
  output: "static",
});
