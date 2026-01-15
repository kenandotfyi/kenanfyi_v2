import { glob } from "astro/loaders";
import { z, defineCollection } from "astro:content";

const bits = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/bits" }),
  schema: z.object({
    draft: z.boolean(),
    title: z.string(),
    description: z.string(),
    published: z.date(),
    excerpt: z.string().optional().default("No excerpt"),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/thoughts" }),
  schema: z.object({
    draft: z.boolean(),
    title: z.string(),
    excerpt: z.string(),
    description: z.string(),
    published: z.date(),
    updated: z.coerce.date(),
    status: z.string(),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/library" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
  }),
});

export const collections = { bits, thoughts, books };
