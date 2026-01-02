import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Post } from '../services/markdown.js';
import { Layout } from './Layout.js';
import { config } from '../config.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export const PostPage: FC<{ post: Post }> = ({ post }) => {
  return (
    <Layout title={post.title}>
      <article>
        <header>
          <h1>{post.title}</h1>
          <time datetime={post.date.toISOString()}>{formatDate(post.date)}</time>
          {post.tags.length > 0 && (
            <div class="tags">
              {post.tags.map(tag => <span class="tag" key={tag}>{tag}</span>)}
            </div>
          )}
        </header>
        <div class="post-content">
          {raw(post.html)}
        </div>
        <div class="fediverse-info">
          <p>
            💬 Reply via Fediverse: Search for <code>@{config.username}@{config.domain}</code> and find this post to comment.
          </p>
        </div>
      </article>
      <nav>
        <a href="/">← Back to Home</a>
      </nav>
    </Layout>
  );
};
