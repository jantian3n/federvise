import type { FC } from 'hono/jsx';
import type { PostMeta } from '../services/markdown.js';
import { Layout } from './Layout.js';
import { QuickPublish } from './QuickPublish.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
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
              <h2><a href={`/posts/${post.slug}`}>{post.title}</a></h2>
              <time datetime={post.date.toISOString()}>{formatDate(post.date)}</time>
              {post.tags.length > 0 && (
                <div class="tags">
                  {post.tags.map(tag => <span class="tag" key={tag}>{tag}</span>)}
                </div>
              )}
              <p>{post.excerpt}</p>
            </article>
          ))
        )}
      </section>
    </Layout>
  );
};
