import { Hono } from 'hono';
import { Feed } from 'feed';
import { getAllPosts, getPost } from '../services/markdown.js';
import { config } from '../config.js';

export const feedRoutes = new Hono();

feedRoutes.get('/feed.xml', (c) => {
  const posts = getAllPosts();

  const feed = new Feed({
    title: config.displayName,
    description: config.summary,
    id: config.baseUrl,
    link: config.baseUrl,
    language: 'zh-CN',
    favicon: `${config.baseUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    author: {
      name: config.displayName,
      link: config.baseUrl,
    },
  });

  for (const postMeta of posts) {
    const post = getPost(postMeta.slug);
    if (!post) continue;

    feed.addItem({
      title: post.title,
      id: `${config.baseUrl}/posts/${post.slug}`,
      link: `${config.baseUrl}/posts/${post.slug}`,
      description: post.excerpt,
      content: post.html,
      date: post.date,
    });
  }

  c.header('Content-Type', 'application/xml');
  return c.body(feed.rss2());
});

// JSON Feed (可选)
feedRoutes.get('/feed.json', (c) => {
  const posts = getAllPosts();

  const feed = new Feed({
    title: config.displayName,
    description: config.summary,
    id: config.baseUrl,
    link: config.baseUrl,
    language: 'zh-CN',
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    author: {
      name: config.displayName,
      link: config.baseUrl,
    },
  });

  for (const postMeta of posts) {
    const post = getPost(postMeta.slug);
    if (!post) continue;

    feed.addItem({
      title: post.title,
      id: `${config.baseUrl}/posts/${post.slug}`,
      link: `${config.baseUrl}/posts/${post.slug}`,
      description: post.excerpt,
      content: post.html,
      date: post.date,
    });
  }

  return c.json(JSON.parse(feed.json1()));
});
