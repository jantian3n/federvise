import { config } from '../config.js';
import { getDb, saveDb } from '../db/index.js';
import { getPost, getAllPosts, type Post } from './markdown.js';
import { signedPost } from './federation.js';
import { AP_CONTEXT, AP_PUBLIC } from '../utils/activitypub.js';

// 将文章转换为 ActivityPub Note 对象
export function postToNote(post: Post): {
  note: Record<string, unknown>;
  objectId: string;
} {
  const objectId = `${config.baseUrl}/posts/${post.slug}`;
  const published = post.date.toISOString();

  // 生成摘要（用于 Mastodon 等显示）
  // Note 类型更适合社交网络，会在时间线上完整显示
  const note = {
    '@context': AP_CONTEXT,
    id: objectId,
    type: 'Note',
    published,
    attributedTo: config.actorId,
    to: [AP_PUBLIC],
    cc: [config.followers],

    // 内容：标题 + 摘要 + 链接
    content: `<p><strong>${escapeHtml(post.title)}</strong></p>` +
             `<p>${escapeHtml(post.excerpt)}</p>` +
             `<p><a href="${objectId}">阅读全文 →</a></p>`,

    // 原始 URL
    url: objectId,

    // 标签
    tag: post.tags.map(tag => ({
      type: 'Hashtag',
      href: `${config.baseUrl}/tags/${encodeURIComponent(tag)}`,
      name: `#${tag}`,
    })),

    // 附件：可以添加文章的 banner 图片
    // attachment: [],

    // 敏感内容标记
    sensitive: false,
  };

  return { note, objectId };
}

// 创建 Create Activity
export function createActivity(note: Record<string, unknown>, objectId: string): {
  activity: Record<string, unknown>;
  activityId: string;
} {
  const activityId = `${objectId}#activity`;

  const activity = {
    '@context': AP_CONTEXT,
    id: activityId,
    type: 'Create',
    actor: config.actorId,
    published: note.published,
    to: [AP_PUBLIC],
    cc: [config.followers],
    object: note,
  };

  return { activity, activityId };
}

// 获取所有关注者的 Inbox（优先使用 sharedInbox）
async function getDeliveryTargets(): Promise<string[]> {
  const db = await getDb();
  const result = db.exec(`
    SELECT DISTINCT COALESCE(shared_inbox, inbox) as target
    FROM followers
  `);

  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }

  return result[0].values.map(row => row[0] as string);
}

// 发布文章到 Fediverse
export async function publishPost(slug: string): Promise<{
  success: boolean;
  message: string;
  deliveredTo?: number;
}> {
  // 获取文章
  const post = getPost(slug);
  if (!post) {
    return { success: false, message: `Post not found: ${slug}` };
  }

  // 检查是否已发布
  const db = await getDb();
  const existing = db.exec(`SELECT id FROM posts WHERE slug = '${slug}' AND federated_at IS NOT NULL`);
  if (existing.length > 0 && existing[0].values.length > 0) {
    return { success: false, message: `Post already published: ${slug}` };
  }

  // 转换为 Note
  const { note, objectId } = postToNote(post);
  const { activity, activityId } = createActivity(note, objectId);

  // 保存到数据库
  db.run(`
    INSERT OR REPLACE INTO posts (slug, title, activity_id, object_id, published_at)
    VALUES (?, ?, ?, ?, ?)
  `, [slug, post.title, activityId, objectId, post.date.toISOString()]);
  saveDb();

  // 获取投递目标
  const targets = await getDeliveryTargets();

  if (targets.length === 0) {
    // 没有关注者，只记录发布
    db.run(`UPDATE posts SET federated_at = datetime('now') WHERE slug = ?`, [slug]);
    saveDb();

    // 记录 outbound activity
    db.run(`
      INSERT INTO activities (type, actor, object, raw, direction)
      VALUES (?, ?, ?, ?, ?)
    `, ['Create', config.actorId, objectId, JSON.stringify(activity), 'outbound']);
    saveDb();

    return {
      success: true,
      message: `Post published (no followers to deliver)`,
      deliveredTo: 0,
    };
  }

  console.log(`Delivering to ${targets.length} inbox(es)...`);

  // 并发投递
  let successCount = 0;
  const deliveryPromises = targets.map(async (inbox) => {
    try {
      const success = await signedPost(inbox, activity);
      if (success) {
        successCount++;
        console.log(`✓ Delivered to: ${inbox}`);
      } else {
        console.log(`✗ Failed to deliver to: ${inbox}`);
      }
      return success;
    } catch (error) {
      console.error(`✗ Error delivering to ${inbox}:`, error);
      return false;
    }
  });

  await Promise.all(deliveryPromises);

  // 更新发布时间
  db.run(`UPDATE posts SET federated_at = datetime('now') WHERE slug = ?`, [slug]);
  saveDb();

  // 记录 outbound activity
  db.run(`
    INSERT INTO activities (type, actor, object, raw, direction)
    VALUES (?, ?, ?, ?, ?)
  `, ['Create', config.actorId, objectId, JSON.stringify(activity), 'outbound']);
  saveDb();

  return {
    success: true,
    message: `Post published and delivered to ${successCount}/${targets.length} inboxes`,
    deliveredTo: successCount,
  };
}

// 获取未发布的文章列表
export async function getUnpublishedPosts(): Promise<string[]> {
  const allPosts = getAllPosts();
  const db = await getDb();

  const unpublished: string[] = [];

  for (const post of allPosts) {
    const result = db.exec(`SELECT id FROM posts WHERE slug = '${post.slug}' AND federated_at IS NOT NULL`);
    if (result.length === 0 || result[0].values.length === 0) {
      unpublished.push(post.slug);
    }
  }

  return unpublished;
}

// HTML 转义
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
