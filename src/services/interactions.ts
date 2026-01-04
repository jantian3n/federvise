/**
 * 互动服务 - 处理评论、点赞、转发
 */
import { getDb, saveDb } from '../db/index.js';
import { config } from '../config.js';

export interface Interaction {
  id: number;
  type: 'reply' | 'like' | 'announce';
  postSlug: string;
  actorId: string;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatar: string | null;
  content: string | null;
  contentHtml: string | null;
  activityId: string;
  objectId: string | null;
  createdAt: Date;
}

export interface InteractionCounts {
  replies: number;
  likes: number;
  announces: number;
}

/**
 * 从 ActivityPub actor ID 提取用户名和域名
 */
function parseActorId(actorId: string): { username: string; domain: string } | null {
  try {
    const url = new URL(actorId);
    const parts = url.pathname.split('/');
    const username = parts[parts.length - 1] || parts[parts.length - 2] || 'unknown';
    return { username, domain: url.host };
  } catch {
    return null;
  }
}

/**
 * 获取远程 actor 信息
 */
export async function fetchActorInfo(actorId: string): Promise<{
  name: string | null;
  username: string | null;
  avatar: string | null;
}> {
  try {
    const response = await fetch(actorId, {
      headers: {
        Accept: 'application/activity+json, application/ld+json',
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch actor ${actorId}: ${response.status}`);
      return { name: null, username: null, avatar: null };
    }

    const actor = await response.json();
    return {
      name: actor.name || actor.preferredUsername || null,
      username: actor.preferredUsername || null,
      avatar: actor.icon?.url || actor.icon || null,
    };
  } catch (error) {
    console.error(`Error fetching actor ${actorId}:`, error);
    return { name: null, username: null, avatar: null };
  }
}

/**
 * 从 object ID 解析 post slug
 */
export function parsePostSlug(objectId: string): string | null {
  try {
    const url = new URL(objectId);
    // 格式: https://domain/posts/{slug} 或 https://domain/posts/{slug}/activity
    const match = url.pathname.match(/\/posts\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * 保存互动
 */
export async function saveInteraction(data: {
  type: 'reply' | 'like' | 'announce';
  postSlug: string;
  postObjectId?: string;
  actorId: string;
  actorName?: string;
  actorUsername?: string;
  actorAvatar?: string;
  content?: string;
  contentHtml?: string;
  activityId: string;
  objectId?: string;
  inReplyTo?: string;
}): Promise<void> {
  const db = await getDb();

  // 检查是否已存在（去重）
  const existing = db.exec(
    `SELECT id FROM interactions WHERE activity_id = '${data.activityId.replace(/'/g, "''")}'`
  );
  if (existing.length > 0 && existing[0].values.length > 0) {
    console.log(`Interaction already exists: ${data.activityId}`);
    return;
  }

  db.run(
    `INSERT INTO interactions (
      type, post_slug, post_object_id, actor_id, actor_name, actor_username,
      actor_avatar, content, content_html, activity_id, object_id, in_reply_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.type,
      data.postSlug,
      data.postObjectId || null,
      data.actorId,
      data.actorName || null,
      data.actorUsername || null,
      data.actorAvatar || null,
      data.content || null,
      data.contentHtml || null,
      data.activityId,
      data.objectId || null,
      data.inReplyTo || null,
    ]
  );
  saveDb();
  console.log(`Saved ${data.type} from ${data.actorId} on ${data.postSlug}`);
}

/**
 * 获取帖子的互动列表
 */
export async function getInteractions(postSlug: string): Promise<Interaction[]> {
  const db = await getDb();
  const result = db.exec(
    `SELECT id, type, post_slug, actor_id, actor_name, actor_username,
            actor_avatar, content, content_html, activity_id, object_id, created_at
     FROM interactions
     WHERE post_slug = '${postSlug.replace(/'/g, "''")}'
     ORDER BY created_at DESC`
  );

  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    id: row[0] as number,
    type: row[1] as 'reply' | 'like' | 'announce',
    postSlug: row[2] as string,
    actorId: row[3] as string,
    actorName: row[4] as string | null,
    actorUsername: row[5] as string | null,
    actorAvatar: row[6] as string | null,
    content: row[7] as string | null,
    contentHtml: row[8] as string | null,
    activityId: row[9] as string,
    objectId: row[10] as string | null,
    createdAt: new Date(row[11] as string),
  }));
}

/**
 * 获取帖子的互动计数
 */
export async function getInteractionCounts(postSlug: string): Promise<InteractionCounts> {
  const db = await getDb();
  const result = db.exec(
    `SELECT type, COUNT(*) as count
     FROM interactions
     WHERE post_slug = '${postSlug.replace(/'/g, "''")}'
     GROUP BY type`
  );

  const counts: InteractionCounts = { replies: 0, likes: 0, announces: 0 };

  if (result.length > 0) {
    for (const row of result[0].values) {
      const type = row[0] as string;
      const count = row[1] as number;
      if (type === 'reply') counts.replies = count;
      else if (type === 'like') counts.likes = count;
      else if (type === 'announce') counts.announces = count;
    }
  }

  return counts;
}

/**
 * 获取所有帖子的互动计数（用于首页）
 */
export async function getAllInteractionCounts(): Promise<Map<string, InteractionCounts>> {
  const db = await getDb();
  const result = db.exec(
    `SELECT post_slug, type, COUNT(*) as count
     FROM interactions
     GROUP BY post_slug, type`
  );

  const countsMap = new Map<string, InteractionCounts>();

  if (result.length > 0) {
    for (const row of result[0].values) {
      const slug = row[0] as string;
      const type = row[1] as string;
      const count = row[2] as number;

      if (!countsMap.has(slug)) {
        countsMap.set(slug, { replies: 0, likes: 0, announces: 0 });
      }

      const counts = countsMap.get(slug)!;
      if (type === 'reply') counts.replies = count;
      else if (type === 'like') counts.likes = count;
      else if (type === 'announce') counts.announces = count;
    }
  }

  return countsMap;
}

/**
 * 删除互动（用于 Undo）
 */
export async function deleteInteraction(activityId: string): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM interactions WHERE activity_id = '${activityId.replace(/'/g, "''")}'`);
  saveDb();
  console.log(`Deleted interaction: ${activityId}`);
}
