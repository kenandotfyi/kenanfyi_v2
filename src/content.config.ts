import { glob } from "astro/loaders";
import { z, defineCollection } from "astro:content";

const bits = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/bits" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.string(),
    // published: z.coerce.date(),
  })
});


const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
  })
});

const books = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/library" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
  })
});

export const collections = { bits, articles, books }
