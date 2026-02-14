import { glob } from "astro/loaders";
import { z, defineCollection } from "astro:content";

const bits = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/bits" }),
  schema: z.object({
    draft: z.boolean(),
    title: z.string(),
    description: z.string(),
    published: z.date(),
    tags: z.union([
      z.array(z.string()),
      z.string().transform(s => s.split(',').map(t => t.trim())),
    ]).default([]),
    excerpt: z.string().optional().default("No excerpt"),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/thoughts" }),
  schema: z.object({
    draft: z.boolean(),
    title: z.string(),
    description: z.string(),
    tags: z.union([
      z.array(z.string()),
      z.string().transform(s => s.split(',').map(t => t.trim())),
    ]).default([]),
    published: z.date(),
    updated: z.coerce.date(),
    status: z.string(),
  }),
});


export const collections = { bits, thoughts };
