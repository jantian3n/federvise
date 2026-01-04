import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Post } from '../services/markdown.js';
import { Layout } from './Layout.js';
import { config } from '../config.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 判断是否为笔记（快捷发布的短内容）
function isNote(post: Post): boolean {
  return post.tags.includes('note') || post.slug.startsWith('note-');
}

export const PostPage: FC<{ post: Post; isLoggedIn?: boolean }> = ({ post, isLoggedIn }) => {
  const noteMode = isNote(post);

  return (
    <Layout title={noteMode ? 'Note' : post.title} isLoggedIn={isLoggedIn}>
      <article>
        <header>
          {!noteMode && <h1>{post.title}</h1>}
          <time datetime={post.date.toISOString()}>{formatDate(post.date)}</time>
          {post.tags.length > 0 && !noteMode && (
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
