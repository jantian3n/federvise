import type { FC } from 'hono/jsx';
import type { PostMeta } from '../services/markdown.js';
import type { InteractionCounts } from '../services/interactions.js';
import { Layout } from './Layout.js';
import { QuickPublish } from './QuickPublish.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 判断是否为笔记（快捷发布的短内容）
function isNote(post: PostMeta): boolean {
  return post.tags.includes('note') || post.slug.startsWith('note-');
}

// 互动统计显示组件
const InteractionStats: FC<{ counts: InteractionCounts; slug: string }> = ({ counts, slug }) => {
  const hasInteractions = counts.replies > 0 || counts.likes > 0 || counts.announces > 0;
  if (!hasInteractions) return null;

  return (
    <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
      {counts.replies > 0 && <span>💬 {counts.replies}</span>}
      {counts.likes > 0 && <span>❤️ {counts.likes}</span>}
      {counts.announces > 0 && <span>🔁 {counts.announces}</span>}
    </div>
  );
};

interface HomePageProps {
  posts: PostMeta[];
  isLoggedIn?: boolean;
  interactionCounts?: Map<string, InteractionCounts>;
}

export const HomePage: FC<HomePageProps> = ({ posts, isLoggedIn, interactionCounts }) => {
  const getCounts = (slug: string): InteractionCounts => {
    return interactionCounts?.get(slug) || { replies: 0, likes: 0, announces: 0 };
  };

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
                  <InteractionStats counts={getCounts(post.slug)} slug={post.slug} />
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
                  <InteractionStats counts={getCounts(post.slug)} slug={post.slug} />
                </>
              )}
            </article>
          ))
        )}
      </section>
    </Layout>
  );
};
