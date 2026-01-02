import { Hono } from 'hono';
import { config } from '../config.js';
import { handleFollow, handleUndo } from '../services/federation.js';

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

async function handleInbox(c: { req: { json: () => Promise<Record<string, unknown>>; header: (name: string) => string | undefined }; json: (data: unknown, status?: number) => Response }) {
  let activity: Record<string, unknown>;

  try {
    activity = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const type = activity.type as string;
  console.log(`Inbox received: ${type} from ${activity.actor}`);

  // TODO: 验证 HTTP Signature
  // 在生产环境中，应该验证请求的签名
  // 这里为了简化，暂时跳过验证

  switch (type) {
    case 'Follow':
      await handleFollow(activity);
      break;

    case 'Undo':
      await handleUndo(activity);
      break;

    case 'Accept':
      // 我们不需要处理 Accept（我们不会主动 Follow 别人）
      console.log(`Received Accept from ${activity.actor}`);
      break;

    case 'Create':
    case 'Update':
    case 'Delete':
    case 'Announce':
    case 'Like':
      // 这些是别人对我们内容的互动，可以记录但不需要特别处理
      console.log(`Received ${type} from ${activity.actor}`);
      break;

    default:
      console.log(`Unhandled activity type: ${type}`);
  }

  // ActivityPub 规范要求返回 202 Accepted
  return c.json({ status: 'accepted' }, 202);
}
