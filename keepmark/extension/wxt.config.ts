import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  outDir: "dist",
  manifest: {
    name: "KeepMark · 留标",
    description:
      "Read English in place: auto-translate on select, grammar on demand, keep only words you mark.",
    version: "0.1.6",
    permissions: ["activeTab", "storage", "contextMenus", "sidePanel"],
    host_permissions: ["http://*/*", "https://*/*"],
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
