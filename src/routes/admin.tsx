import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { config } from '../config.js';
import { getAllPosts } from '../services/markdown.js';
import { getUnpublishedPosts, publishPost } from '../services/publish.js';
import { Layout } from '../views/Layout.js';

export const adminRoutes = new Hono();

// Basic Auth 中间件
adminRoutes.use('*', basicAuth({
  username: 'admin',
  password: config.adminPassword,
}));

// 管理页面
adminRoutes.get('/admin', async (c) => {
  const allPosts = getAllPosts();
  const unpublished = await getUnpublishedPosts();

  const posts = allPosts.map(post => ({
    ...post,
    published: !unpublished.includes(post.slug),
  }));

  const content = (
    <div>
      <h1>Admin</h1>

      <div style="margin-bottom: 2rem;">
        <h2>Posts</h2>
        {unpublished.length > 0 && (
          <form method="post" action="/admin/publish-all" style="margin-bottom: 1rem;">
            <button type="submit" style="background: #2563eb; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
              Publish All ({unpublished.length})
            </button>
          </form>
        )}

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb;">
              <th style="text-align: left; padding: 0.75rem;">Status</th>
              <th style="text-align: left; padding: 0.75rem;">Title</th>
              <th style="text-align: left; padding: 0.75rem;">Date</th>
              <th style="text-align: left; padding: 0.75rem;">Action</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 0.75rem;">
                  {post.published ? (
                    <span style="color: #16a34a;">Published</span>
                  ) : (
                    <span style="color: #ca8a04;">Draft</span>
                  )}
                </td>
                <td style="padding: 0.75rem;">
                  <a href={`/posts/${post.slug}`}>{post.title}</a>
                </td>
                <td style="padding: 0.75rem;">
                  {post.date.toISOString().split('T')[0]}
                </td>
                <td style="padding: 0.75rem;">
                  {!post.published && (
                    <form method="post" action={`/admin/publish/${post.slug}`} style="display: inline;">
                      <button type="submit" style="background: #16a34a; color: white; padding: 0.25rem 0.75rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                        Publish
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
        <a href="/">&larr; Back to Blog</a>
      </div>
    </div>
  );

  return c.html(
    <Layout title="Admin - Federvise">
      {content}
    </Layout>
  );
});

// 发布单篇文章
adminRoutes.post('/admin/publish/:slug', async (c) => {
  const slug = c.req.param('slug');
  const result = await publishPost(slug);

  if (result.success) {
    return c.redirect('/admin?message=' + encodeURIComponent(result.message));
  } else {
    return c.redirect('/admin?error=' + encodeURIComponent(result.message));
  }
});

// 发布所有未发布的文章
adminRoutes.post('/admin/publish-all', async (c) => {
  const unpublished = await getUnpublishedPosts();
  let successCount = 0;

  for (const slug of unpublished) {
    const result = await publishPost(slug);
    if (result.success) {
      successCount++;
    }
  }

  const message = `Published ${successCount}/${unpublished.length} posts`;
  return c.redirect('/admin?message=' + encodeURIComponent(message));
});
