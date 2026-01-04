import { Hono } from 'hono';
import { config } from '../config.js';
import { getAllPosts } from '../services/markdown.js';
import { getUnpublishedPosts, publishPost } from '../services/publish.js';
import { Layout } from '../views/Layout.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { requireAuth, apiAuth } from '../middleware/auth.js';

export const adminRoutes = new Hono();

// ============== Web Admin (Session Auth) ==============

// 管理页面
adminRoutes.get('/admin', requireAuth, async (c) => {
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
            <button type="submit" style="background: var(--accent); color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
              Publish All ({unpublished.length})
            </button>
          </form>
        )}

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border);">
              <th style="text-align: left; padding: 0.75rem;">Status</th>
              <th style="text-align: left; padding: 0.75rem;">Title</th>
              <th style="text-align: left; padding: 0.75rem;">Date</th>
              <th style="text-align: left; padding: 0.75rem;">Action</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr style="border-bottom: 1px solid var(--border);">
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

      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border);">
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
adminRoutes.post('/admin/publish/:slug', requireAuth, async (c) => {
  const slug = c.req.param('slug');
  const result = await publishPost(slug);

  if (result.success) {
    return c.redirect('/admin?message=' + encodeURIComponent(result.message));
  } else {
    return c.redirect('/admin?error=' + encodeURIComponent(result.message));
  }
});

// 发布所有未发布的文章
adminRoutes.post('/admin/publish-all', requireAuth, async (c) => {
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

// ============== API (Session + Bearer Token Auth) ==============

// API: 获取所有文章
adminRoutes.get('/api/posts', apiAuth, async (c) => {
  const allPosts = getAllPosts();
  const unpublished = await getUnpublishedPosts();

  const posts = allPosts.map(post => ({
    slug: post.slug,
    title: post.title,
    date: post.date.toISOString(),
    tags: post.tags,
    published: !unpublished.includes(post.slug),
  }));

  return c.json({ posts });
});

// API: 创建/更新文章
adminRoutes.post('/api/posts', apiAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { slug, content, publish } = body as {
      slug: string;
      content: string;
      publish?: boolean;
    };

    if (!slug || !content) {
      return c.json({ error: 'Missing slug or content' }, 400);
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return c.json({ error: 'Invalid slug format (use lowercase letters, numbers, hyphens only)' }, 400);
    }

    const filePath = join(process.cwd(), 'content', `${slug}.md`);
    writeFileSync(filePath, content, 'utf-8');
    console.log(`Saved post: ${filePath}`);

    let publishResult = null;

    if (publish) {
      publishResult = await publishPost(slug);
    }

    return c.json({
      success: true,
      slug,
      published: publish ? publishResult?.success : false,
      message: publish ? publishResult?.message : 'Post saved (not published)',
    });
  } catch (error) {
    console.error('API error:', error);
    return c.json({ error: 'Failed to save post' }, 500);
  }
});

// API: 发布文章
adminRoutes.post('/api/posts/:slug/publish', apiAuth, async (c) => {
  const slug = c.req.param('slug');
  const result = await publishPost(slug);

  return c.json({
    success: result.success,
    message: result.message,
    deliveredTo: result.deliveredTo,
  });
});

// API: 发布所有未发布的文章
adminRoutes.post('/api/publish-all', apiAuth, async (c) => {
  const unpublished = await getUnpublishedPosts();
  const results: { slug: string; success: boolean; message: string }[] = [];

  for (const slug of unpublished) {
    const result = await publishPost(slug);
    results.push({
      slug,
      success: result.success,
      message: result.message,
    });
  }

  return c.json({
    total: unpublished.length,
    published: results.filter(r => r.success).length,
    results,
  });
});

// ============== Notes API (快捷发布) ==============

adminRoutes.post('/api/notes', apiAuth, async (c) => {
  try {
    let content: string;
    let tags: string[] = ['note'];

    const contentType = c.req.header('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      content = body.content;
      if (body.tags) tags = body.tags;
    } else {
      const body = await c.req.parseBody();
      content = body.content as string;
    }

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Content is required' }, 400);
    }

    if (content.length > 500) {
      return c.json({ error: 'Content too long (max 500 chars)' }, 400);
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);
    const slug = `note-${timestamp}`;

    const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');

    const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${now.toISOString()}
tags: [${tags.map(t => `"${t}"`).join(', ')}]
---

${content}`;

    const filePath = join(process.cwd(), 'content', `${slug}.md`);
    writeFileSync(filePath, frontMatter, 'utf-8');
    console.log(`Saved note: ${filePath}`);

    const publishResult = await publishPost(slug);

    if (!contentType.includes('application/json')) {
      return c.redirect('/?published=' + slug);
    }

    return c.json({
      success: publishResult.success,
      slug,
      message: publishResult.message,
    });
  } catch (error) {
    console.error('Note creation error:', error);
    return c.json({ error: 'Failed to create note' }, 500);
  }
});
