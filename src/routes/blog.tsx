import { Hono } from 'hono';
import { getAllPosts, getPost } from '../services/markdown.js';
import { HomePage } from '../views/HomePage.js';
import { PostPage } from '../views/PostPage.js';

export const blogRoutes = new Hono();

// 首页 - 文章列表
blogRoutes.get('/', (c) => {
  const posts = getAllPosts();
  return c.html(<HomePage posts={posts} />);
});

// 文章详情页
blogRoutes.get('/posts/:slug', (c) => {
  const slug = c.req.param('slug');
  const post = getPost(slug);

  if (!post) {
    return c.text('Post not found', 404);
  }

  return c.html(<PostPage post={post} />);
});
