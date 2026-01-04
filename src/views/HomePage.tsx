import type { FC } from 'hono/jsx';
import type { PostMeta } from '../services/markdown.js';
import { Layout } from './Layout.js';
import { QuickPublish } from './QuickPublish.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 判断是否为笔记（快捷发布的短内容）
function isNote(post: PostMeta): boolean {
  return post.tags.includes('note') || post.slug.startsWith('note-');
}

export const HomePage: FC<{ posts: PostMeta[]; isLoggedIn?: boolean }> = ({ posts, isLoggedIn }) => {
  return (
    <Layout isLoggedIn={isLoggedIn}>
      {isLoggedIn && <QuickPublish />}
      <section>
        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          posts.map(post => (
            <article key={post.slug}>
              {isNote(post) ? (
                // 笔记：直接显示内容，不显示标题
                <>
                  <p style="margin-bottom: 0.5rem;">{post.excerpt}</p>
                  <div style="display: flex; gap: 1rem; align-items: center; font-size: 0.875rem;">
                    <time datetime={post.date.toISOString()} style="color: var(--text-secondary);">
                      {formatDate(post.date)}
                    </time>
                    <a href={`/posts/${post.slug}`} style="color: var(--text-secondary);">View →</a>
                  </div>
                </>
              ) : (
                // 普通文章：显示标题 + 摘要
                <>
                  <h2><a href={`/posts/${post.slug}`}>{post.title}</a></h2>
                  <time datetime={post.date.toISOString()}>{formatDate(post.date)}</time>
                  {post.tags.length > 0 && (
                    <div class="tags">
                      {post.tags.map(tag => <span class="tag" key={tag}>{tag}</span>)}
                    </div>
                  )}
                  <p>{post.excerpt}</p>
                </>
              )}
            </article>
          ))
        )}
      </section>
    </Layout>
  );
};
