import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {

  const thoughts = await getCollection("thoughts", ({ data }) => data.draft !== true);
  const bits = await getCollection("bits", ({ data }) => data.draft !== true);

  const allPosts = [...thoughts, ...bits]
    .sort((a, b) => b.data.published - a.data.published);

  return rss({
    title: 'kenan.fyi',
    description: 'bits from my second brain',
    site: context.site,
    trailingSlash: false,
    items: allPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.published,
      description: post.data.description,
      link: `/${post.collection}/${post.id}/`,
    })),
  });
}
