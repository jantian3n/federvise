import { Hono } from 'hono';
import { config } from '../config.js';
import { handleFollow, handleUndo } from '../services/federation.js';
import {
  saveInteraction,
  fetchActorInfo,
  parsePostSlug,
  deleteInteraction,
} from '../services/interactions.js';

export const inboxRoutes = new Hono();

// 用户 Inbox
inboxRoutes.post('/users/:username/inbox', async (c) => {
  const username = c.req.param('username');

  if (username !== config.username) {
    return c.json({ error: 'User not found' }, 404);
  }

  return handleInbox(c);
});

// Shared Inbox（所有用户共享）
inboxRoutes.post('/inbox', async (c) => {
  return handleInbox(c);
});

async function handleInbox(c: {
  req: { json: () => Promise<Record<string, unknown>>; header: (name: string) => string | undefined };
  json: (data: unknown, status?: number) => Response;
}) {
  let activity: Record<string, unknown>;

  try {
    activity = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const type = activity.type as string;
  const actorId = activity.actor as string;
  console.log(`Inbox received: ${type} from ${actorId}`);

  // TODO: 验证 HTTP Signature
  // 在生产环境中，应该验证请求的签名

  switch (type) {
    case 'Follow':
      await handleFollow(activity);
      break;

    case 'Undo':
      await handleUndoActivity(activity);
      break;

    case 'Accept':
      console.log(`Received Accept from ${actorId}`);
      break;

    case 'Create':
      await handleCreate(activity);
      break;

    case 'Like':
      await handleLike(activity);
      break;

    case 'Announce':
      await handleAnnounce(activity);
      break;

    case 'Delete':
      console.log(`Received Delete from ${actorId}`);
      break;

    case 'Update':
      console.log(`Received Update from ${actorId}`);
      break;

    default:
      console.log(`Unhandled activity type: ${type}`);
  }

  return c.json({ status: 'accepted' }, 202);
}

/**
 * 处理 Create 活动（主要是回复）
 */
async function handleCreate(activity: Record<string, unknown>): Promise<void> {
  const actorId = activity.actor as string;
  const object = activity.object as Record<string, unknown>;

  if (!object || typeof object !== 'object') {
    console.log('Create activity has no valid object');
    return;
  }

  const objectType = object.type as string;
  if (objectType !== 'Note') {
    console.log(`Ignoring Create for type: ${objectType}`);
    return;
  }

  const inReplyTo = object.inReplyTo as string;
  if (!inReplyTo) {
    console.log('Note is not a reply, ignoring');
    return;
  }

  // 检查是否回复的是我们的帖子
  const postSlug = parsePostSlug(inReplyTo);
  if (!postSlug) {
    console.log(`Could not parse post slug from: ${inReplyTo}`);
    return;
  }

  console.log(`Received reply to post: ${postSlug}`);

  // 获取 actor 信息
  const actorInfo = await fetchActorInfo(actorId);

  // 保存回复
  await saveInteraction({
    type: 'reply',
    postSlug,
    postObjectId: inReplyTo,
    actorId,
    actorName: actorInfo.name || undefined,
    actorUsername: actorInfo.username || undefined,
    actorAvatar: actorInfo.avatar || undefined,
    content: object.content as string,
    contentHtml: object.content as string,
    activityId: activity.id as string,
    objectId: object.id as string,
    inReplyTo,
  });
}

/**
 * 处理 Like 活动
 */
async function handleLike(activity: Record<string, unknown>): Promise<void> {
  const actorId = activity.actor as string;
  const objectId = typeof activity.object === 'string'
    ? activity.object
    : (activity.object as Record<string, unknown>)?.id as string;

  if (!objectId) {
    console.log('Like activity has no valid object');
    return;
  }

  const postSlug = parsePostSlug(objectId);
  if (!postSlug) {
    console.log(`Could not parse post slug from: ${objectId}`);
    return;
  }

  console.log(`Received like for post: ${postSlug}`);

  const actorInfo = await fetchActorInfo(actorId);

  await saveInteraction({
    type: 'like',
    postSlug,
    postObjectId: objectId,
    actorId,
    actorName: actorInfo.name || undefined,
    actorUsername: actorInfo.username || undefined,
    actorAvatar: actorInfo.avatar || undefined,
    activityId: activity.id as string,
    objectId,
  });
}

/**
 * 处理 Announce 活动（转发/boost）
 */
async function handleAnnounce(activity: Record<string, unknown>): Promise<void> {
  const actorId = activity.actor as string;
  const objectId = typeof activity.object === 'string'
    ? activity.object
    : (activity.object as Record<string, unknown>)?.id as string;

  if (!objectId) {
    console.log('Announce activity has no valid object');
    return;
  }

  const postSlug = parsePostSlug(objectId);
  if (!postSlug) {
    console.log(`Could not parse post slug from: ${objectId}`);
    return;
  }

  console.log(`Received boost for post: ${postSlug}`);

  const actorInfo = await fetchActorInfo(actorId);

  await saveInteraction({
    type: 'announce',
    postSlug,
    postObjectId: objectId,
    actorId,
    actorName: actorInfo.name || undefined,
    actorUsername: actorInfo.username || undefined,
    actorAvatar: actorInfo.avatar || undefined,
    activityId: activity.id as string,
    objectId,
  });
}

/**
 * 处理 Undo 活动
 */
async function handleUndoActivity(activity: Record<string, unknown>): Promise<void> {
  const object = activity.object as Record<string, unknown>;

  if (!object || typeof object !== 'object') {
    // 可能是 Undo Follow
    await handleUndo(activity);
    return;
  }

  const objectType = object.type as string;

  if (objectType === 'Follow') {
    await handleUndo(activity);
  } else if (objectType === 'Like' || objectType === 'Announce') {
    // 撤销点赞或转发
    const objectId = object.id as string;
    if (objectId) {
      await deleteInteraction(objectId);
    }
  }
}
