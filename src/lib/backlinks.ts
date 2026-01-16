// src/lib/backlinks.ts
import { getCollection, type CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'thoughts'> | CollectionEntry<'bits'>;
type CollectionName = 'thoughts' | 'bits' | 'electronics';

let backlinksMap: Map<string, Post[]> | null = null;

export async function getBacklinks(targetId: string): Promise<Post[]> {
  if (!backlinksMap) {
    backlinksMap = await buildBacklinksMap();
  }
  return backlinksMap.get(targetId) || [];
}

async function buildBacklinksMap(): Promise<Map<string, Post[]>> {
  const [thoughts, bits] = await Promise.all([
    getCollection('thoughts'),
    getCollection('bits'),
  ]);

  const allPosts: Post[] = [...thoughts, ...bits,];

  // Build a set of valid paths for link validation
  const validPaths = new Set<string>();
  for (const post of allPosts) {
    validPaths.add(`/${post.collection}/${post.id}`);
  }

  const map = new Map<string, Post[]>();

  // Initialize empty arrays for all posts
  for (const post of allPosts) {
    map.set(post.id, []);
  }

  // For each post, find internal links and register backlinks
  for (const post of allPosts) {
    if (!post.body) continue;

    const linkedIds = extractInternalLinks(post.body, validPaths);

    for (const linkedId of linkedIds) {
      if (linkedId === post.id) continue; // skip self-links

      const existing = map.get(linkedId) || [];
      if (!existing.some(p => p.id === post.id)) {
        existing.push(post);
        map.set(linkedId, existing);
      }
    }
  }

  return map;
}

function extractInternalLinks(markdown: string, validPaths: Set<string>): string[] {
  const ids: string[] = [];

  // Match markdown links: [text](/thoughts/some-id) or [text](/bits/some-id/) etc.
  const linkPattern = /\[.*?\]\(\/(thoughts|bits)\/([a-z0-9-]+)\/?(?:#[^\)]+)?\)/gi;

  let match;
  while ((match = linkPattern.exec(markdown)) !== null) {
    const collection = match[1];
    const id = match[2];
    const fullPath = `/${collection}/${id}`;

    if (validPaths.has(fullPath)) {
      ids.push(id);
    }
  }

  return ids;
}
