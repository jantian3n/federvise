import { Hono } from 'hono';
import { getAllPosts, getPost } from '../services/markdown.js';
import { HomePage } from '../views/HomePage.js';
import { PostPage } from '../views/PostPage.js';
import { checkAuth } from '../middleware/auth.js';

type Variables = {
  isLoggedIn: boolean;
};

export const blogRoutes = new Hono<{ Variables: Variables }>();

// 首页 - 文章列表
blogRoutes.get('/', checkAuth, (c) => {
  const posts = getAllPosts();
  const isLoggedIn = c.get('isLoggedIn');
  return c.html(<HomePage posts={posts} isLoggedIn={isLoggedIn} />);
});

// 文章详情页
blogRoutes.get('/posts/:slug', checkAuth, (c) => {
  const slug = c.req.param('slug');
  const post = getPost(slug);
  const isLoggedIn = c.get('isLoggedIn');

  if (!post) {
    return c.text('Post not found', 404);
  }

  return c.html(<PostPage post={post} isLoggedIn={isLoggedIn} />);
});
