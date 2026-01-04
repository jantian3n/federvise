import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Post } from '../services/markdown.js';
import type { Interaction } from '../services/interactions.js';
import { Layout } from './Layout.js';
import { config } from '../config.js';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 16);
}

// 判断是否为笔记（快捷发布的短内容）
function isNote(post: Post): boolean {
  return post.tags.includes('note') || post.slug.startsWith('note-');
}

// 从 actor ID 提取显示名
function getActorDisplay(interaction: Interaction): string {
  if (interaction.actorName) return interaction.actorName;
  if (interaction.actorUsername) return `@${interaction.actorUsername}`;
  try {
    const url = new URL(interaction.actorId);
    return url.pathname.split('/').pop() || 'Someone';
  } catch {
    return 'Someone';
  }
}

// 从 actor ID 提取域名
function getActorDomain(actorId: string): string {
  try {
    return new URL(actorId).host;
  } catch {
    return '';
  }
}

// 回复组件
const ReplyItem: FC<{ reply: Interaction }> = ({ reply }) => {
  const name = getActorDisplay(reply);
  const domain = getActorDomain(reply.actorId);

  return (
    <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
        {reply.actorAvatar ? (
          <img
            src={reply.actorAvatar}
            alt=""
            style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
          />
        ) : (
          <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center;">
            👤
          </div>
        )}
        <div>
          <a href={reply.actorId} target="_blank" rel="noopener" style="font-weight: 500;">
            {name}
          </a>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">
            @{reply.actorUsername || 'user'}@{domain}
          </div>
        </div>
        <div style="margin-left: auto; font-size: 0.75rem; color: var(--text-secondary);">
          {formatDateTime(reply.createdAt)}
        </div>
      </div>
      <div style="padding-left: 52px;">
        {reply.contentHtml ? raw(reply.contentHtml) : reply.content}
      </div>
    </div>
  );
};

// 点赞/转发者头像列表
const AvatarList: FC<{ interactions: Interaction[]; type: 'like' | 'announce' }> = ({ interactions, type }) => {
  if (interactions.length === 0) return null;

  const icon = type === 'like' ? '❤️' : '🔁';
  const label = type === 'like' ? 'Likes' : 'Boosts';

  return (
    <div style="margin-bottom: 1.5rem;">
      <h4 style="margin-bottom: 0.75rem;">{icon} {interactions.length} {label}</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        {interactions.map((i) => (
          <a
            key={i.activityId}
            href={i.actorId}
            target="_blank"
            rel="noopener"
            title={getActorDisplay(i)}
            style="display: block;"
          >
            {i.actorAvatar ? (
              <img
                src={i.actorAvatar}
                alt={getActorDisplay(i)}
                style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;"
              />
            ) : (
              <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.875rem;">
                👤
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};

interface PostPageProps {
  post: Post;
  isLoggedIn?: boolean;
  interactions?: Interaction[];
}

export const PostPage: FC<PostPageProps> = ({ post, isLoggedIn, interactions = [] }) => {
  const noteMode = isNote(post);

  const replies = interactions.filter((i) => i.type === 'reply');
  const likes = interactions.filter((i) => i.type === 'like');
  const announces = interactions.filter((i) => i.type === 'announce');

  const hasInteractions = interactions.length > 0;

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

        {/* 互动统计 */}
        {hasInteractions && (
          <div style="display: flex; gap: 1.5rem; padding: 1rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin: 1.5rem 0;">
            {replies.length > 0 && <span>💬 {replies.length} Comments</span>}
            {likes.length > 0 && <span>❤️ {likes.length} Likes</span>}
            {announces.length > 0 && <span>🔁 {announces.length} Boosts</span>}
          </div>
        )}

        {/* 点赞和转发 */}
        {(likes.length > 0 || announces.length > 0) && (
          <div style="margin: 1.5rem 0;">
            <AvatarList interactions={likes} type="like" />
            <AvatarList interactions={announces} type="announce" />
          </div>
        )}

        {/* 评论列表 */}
        {replies.length > 0 && (
          <div style="margin: 1.5rem 0;">
            <h3 style="margin-bottom: 1rem;">💬 Comments ({replies.length})</h3>
            {replies.map((reply) => (
              <ReplyItem key={reply.activityId} reply={reply} />
            ))}
          </div>
        )}

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
