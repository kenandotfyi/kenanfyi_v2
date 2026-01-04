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
      themes: ["one-light"],
      styleOverrides: {
        borderRadius: "0",
        codeFontFamily: "Iosevka",
        codeFontSize: "15px",
        uiFontSize: "13px",
        frames: {
          frameBoxShadowCssValue: "none",
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
