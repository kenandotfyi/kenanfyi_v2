// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import { remarkReadingTime } from "./src/lib/remark-readtime.mjs";
import { existsSync, mkdirSync, readFileSync, readdirSync, copyFileSync } from "fs";
import { join } from "path";

import rehypeKatex from "rehype-katex";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSidenotes from "./src/lib/rehype-sidenotes.mjs";
import rehypeHrDivider from "./src/lib/rehype-hr-divider.mjs";
import expressiveCode, { ExpressiveCodeTheme } from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import mdx from "@astrojs/mdx";

import svelte from "@astrojs/svelte";

import icon from "astro-icon";


const darkFile = readFileSync(new URL(`./src/assets/code-themes/dark.jsonc`, import.meta.url), 'utf-8')
const lightFile = readFileSync(new URL(`./src/assets/code-themes/light.jsonc`, import.meta.url), 'utf-8')

const darkTheme = ExpressiveCodeTheme.fromJSONString(darkFile)
const lightTheme = ExpressiveCodeTheme.fromJSONString(lightFile)



// https://astro.build/config
export default defineConfig({
  site: "https://kenan.fyi",
  output: "static",
  scopedStyleStrategy: "class",
  fonts: [{
    provider: fontProviders.local(),
    name: "Inter Variable",
    cssVariable: "--font-sans",
    options: {
      variants: [{
        src: ['./src/assets/fonts/InterVariable.woff2'],
      }]
    }
  }, {
    provider: fontProviders.local(),
    name: "JetBrains Mono",
    cssVariable: "--font-mono",
    options: {
      variants: [{
        src: ['./src/assets/fonts/JetBrainsMono-Regular.woff2'],
      }]
    }
  }

  ],
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
      themes: [darkTheme, lightTheme],
      themeCssSelector: (theme) =>
        `[data-theme='${theme.type}']`,
      styleOverrides: {
        borderRadius: "0px",
        codeFontFamily: "var(--font-mono)",
        uiFontFamily: "var(--font-mono)",
        codeFontSize: "14px",
        uiFontSize: "13px",
        uiFontWeight: "bold",
        frames: {
          frameBoxShadowCssValue: "none",
          editorActiveTabIndicatorTopColor: "none",
          editorActiveTabIndicatorBottomColor: "none",
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
