// @ts-check
import { defineConfig } from "astro/config";
import { remarkReadingTime } from "./src/lib/remark-readtime.mjs";

import rehypeKatex from "rehype-katex";
import rehypeExternalLinks from "rehype-external-links";
import expressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import mdx from "@astrojs/mdx";

import svelte from "@astrojs/svelte";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://kenan.fyi",
  scopedStyleStrategy: "class",
  integrations: [
    expressiveCode({
      plugins: [],
      frames: {
        showCopyToClipboardButton: false,
      },
      shiki: {
      },
      themes: ["vesper"],
      styleOverrides: {
        borderRadius: "0.1rem",
        codeFontFamily: "JetBrains Mono",
        uiFontFamily: "JetBrains Mono",
        codeFontSize: "14px",
        uiFontSize: "13px",
        uiFontWeight: "bold",
        frames: {
          frameBoxShadowCssValue: "none",

        },
        textMarkers: {
          markBackground: "gainsboro",
        },
      },
    }),
    mdx({
      extendMarkdownConfig: true,
    }),
    svelte(),
    icon(),
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime],
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          properties: {
            className: "external-link",
          },
          target: "_blank",
          rel: "noopener",
        },
      ],
      [rehypeKatex, {}],
    ]
  }
});
