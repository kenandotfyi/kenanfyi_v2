import { glob } from "astro/loaders";
import { z, defineCollection } from "astro:content";

const bits = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/bits" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.date().transform((date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }),
    excerpt: z.string().optional().default("No excerpt"),
  }),
});

const blogs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" }),
  schema: z.object({
    draft: z.boolean(),
    title: z.string(),
    description: z.string(),
    published: z.date().transform((date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }),
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

export const collections = { bits, blogs, books };
