// @ts-check
import { defineConfig } from "astro/config";

import expressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import mdx from "@astrojs/mdx";

import svelte from "@astrojs/svelte";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  scopedStyleStrategy: "class",
  integrations: [
    expressiveCode({
      plugins: [pluginLineNumbers()],
      frames: {
        showCopyToClipboardButton: false,
      },
      themes: ["one-light"],
      styleOverrides: {
        borderRadius: "0.25rem",
        codeFontFamily: "JetBrains Mono",
        uiFontFamily: "JetBrains Mono",
        codeFontSize: "14px",
        uiFontSize: "13px",
        uiFontWeight: "bold",
        frames: {
          frameBoxShadowCssValue: "none",
          editorTabBarBackground: "#FAFAFA",

        },
        textMarkers: {
          markBackground: "gainsboro",
        },
      },
    }),
    mdx(),
    svelte(),
    icon(),
  ],
});
