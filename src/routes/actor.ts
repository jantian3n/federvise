import { Hono } from 'hono';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { getPost } from '../services/markdown.js';
import { postToNote, createActivity } from '../services/publish.js';
import { AP_CONTEXT, AP_CONTENT_TYPE, acceptsActivityPub } from '../utils/activitypub.js';

export const actorRoutes = new Hono();

// 获取用户信息
async function getUser() {
  const db = await getDb();
  const result = db.exec(`SELECT * FROM users WHERE username = '${config.username}'`);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  const columns = result[0].columns;
  const values = result[0].values[0];
  const user: Record<string, unknown> = {};

  columns.forEach((col, i) => {
    user[col] = values[i];
  });

  return user;
}

// Actor 端点 - 返回 JSON-LD 格式的用户资料
actorRoutes.get('/users/:username', async (c) => {
  const username = c.req.param('username');

  if (username !== config.username) {
    return c.json({ error: 'User not found' }, 404);
  }

  const user = await getUser();
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // 检查是否请求 ActivityPub 格式
  const accept = c.req.header('Accept');
  if (!acceptsActivityPub(accept)) {
    // 如果不是 AP 请求，重定向到首页
    return c.redirect('/');
  }

  const actor = {
    '@context': AP_CONTEXT,
    id: config.actorId,
    type: 'Person',
    preferredUsername: config.username,
    name: user.display_name || config.displayName,
    summary: user.summary || config.summary,
    url: config.baseUrl,
    inbox: config.inbox,
    outbox: config.outbox,
    followers: config.followers,

    // 公钥，用于验证签名
    publicKey: {
      id: config.publicKeyId,
      owner: config.actorId,
      publicKeyPem: user.public_key,
    },

    // 可选：头像和 banner
    // icon: {
    //   type: 'Image',
    //   mediaType: 'image/png',
    //   url: `${config.baseUrl}/avatar.png`,
    // },

    // 端点信息
    endpoints: {
      sharedInbox: `${config.baseUrl}/inbox`,
    },
  };

  c.header('Content-Type', `${AP_CONTENT_TYPE}; charset=utf-8`);
  return c.body(JSON.stringify(actor));
});

// Followers 集合
actorRoutes.get('/users/:username/followers', async (c) => {
  const username = c.req.param('username');

  if (username !== config.username) {
    return c.json({ error: 'User not found' }, 404);
  }

  const db = await getDb();
  const result = db.exec('SELECT COUNT(*) as count FROM followers');
  const totalItems = result.length > 0 ? (result[0].values[0][0] as number) : 0;

  const collection = {
    '@context': AP_CONTEXT,
    id: config.followers,
    type: 'OrderedCollection',
    totalItems,
    // 简化实现：不分页
    orderedItems: [],
  };

  c.header('Content-Type', `${AP_CONTENT_TYPE}; charset=utf-8`);
  return c.body(JSON.stringify(collection));
});

// Outbox 集合 - 返回已发布的文章
actorRoutes.get('/users/:username/outbox', async (c) => {
  const username = c.req.param('username');

  if (username !== config.username) {
    return c.json({ error: 'User not found' }, 404);
  }

  const db = await getDb();

  // 获取所有已发布的文章
  const postsResult = db.exec(`
    SELECT slug, published_at
    FROM posts
    WHERE federated_at IS NOT NULL
    ORDER BY published_at DESC
  `);

  const orderedItems: Record<string, unknown>[] = [];

  if (postsResult.length > 0 && postsResult[0].values.length > 0) {
    for (const row of postsResult[0].values) {
      const slug = row[0] as string;
      const post = getPost(slug);

      if (post) {
        const { note, objectId } = postToNote(post);
        const { activity } = createActivity(note, objectId);
        orderedItems.push(activity);
      }
    }
  }

  const collection = {
    '@context': AP_CONTEXT,
    id: config.outbox,
    type: 'OrderedCollection',
    totalItems: orderedItems.length,
    orderedItems,
  };

  c.header('Content-Type', `${AP_CONTENT_TYPE}; charset=utf-8`);
  return c.body(JSON.stringify(collection));
});
