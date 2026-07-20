import { defineConfig } from "wxt";

const apiBase =
  process.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://43.165.167.70:8080";

export default defineConfig({
  srcDir: ".",
  outDir: "dist",
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "KeepMark",
    description:
      "Read English in place: auto-translate on select, grammar on demand, keep only words you mark.",
    version: "0.1.7",
    permissions: ["activeTab", "storage", "contextMenus", "sidePanel"],
    host_permissions: [`${apiBase}/*`],
    side_panel: {
      default_path: "sidepanel.html",
    },
    icons: {
      16: "icon-16.png",
      32: "icon-32.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
  },
});
