// @ts-check
import { defineConfig } from "astro/config";
import { remarkReadingTime } from "./src/lib/remark-readtime.mjs";
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "fs";
import { join } from "path";

import rehypeKatex from "rehype-katex";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSidenotes from "./src/lib/rehype-sidenotes.mjs";
import rehypeHrDivider from "./src/lib/rehype-hr-divider.mjs";
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
    // since Vite copies the public/ to dist/ before page frontmatter runs.
    // files in public/covers during rendering never copied there.
    // this hook explicitly copies the covers directory to the dist directory after render.
    {
      name: "copy-covers",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          const distPath = new URL(dir).pathname;
          for (const folder of ["covers", "og"]) {
            const srcDir = join(process.cwd(), "public", folder);
            if (!existsSync(srcDir)) continue;
            const destDir = join(distPath, folder);
            if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
            for (const file of readdirSync(srcDir)) {
              copyFileSync(join(srcDir, file), join(destDir, file));
            }
          }
        },
      },
    },
    expressiveCode({
      plugins: [],
      frames: {
        showCopyToClipboardButton: false,
      },
      shiki: {
      },
      themes: ["vesper", "github-light"],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) =>
        theme.type === "light"
          ? '[data-theme="light"]'
          : ':not([data-theme="light"])',
      styleOverrides: {
        borderRadius: "0px",
        codeFontFamily: "IBM Plex Mono",
        uiFontFamily: "IBM Plex Mono",
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
      rehypeSidenotes,
      rehypeHrDivider,
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
