import { Hono } from 'hono';
import { config } from '../config.js';

export const webfingerRoutes = new Hono();

// WebFinger - 资源发现协议
// 当 Mastodon 搜索 @blog@example.com 时，会请求这个端点
webfingerRoutes.get('/.well-known/webfinger', (c) => {
  const resource = c.req.query('resource');

  if (!resource) {
    return c.json({ error: 'Missing resource parameter' }, 400);
  }

  // 支持 acct:username@domain 格式
  const expectedResource = `acct:${config.username}@${config.domain}`;

  if (resource !== expectedResource) {
    return c.json({ error: 'Resource not found' }, 404);
  }

  const response = {
    subject: expectedResource,
    aliases: [
      config.actorId,
    ],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: config.actorId,
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: config.baseUrl,
      },
    ],
  };

  c.header('Content-Type', 'application/jrd+json; charset=utf-8');
  return c.body(JSON.stringify(response));
});

// Host-meta (某些实现可能需要)
webfingerRoutes.get('/.well-known/host-meta', (c) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
  <Link rel="lrdd" template="${config.baseUrl}/.well-known/webfinger?resource={uri}"/>
</XRD>`;

  c.header('Content-Type', 'application/xrd+xml; charset=utf-8');
  return c.body(xml);
});

// NodeInfo - 用于显示实例信息
webfingerRoutes.get('/.well-known/nodeinfo', (c) => {
  return c.json({
    links: [
      {
        rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
        href: `${config.baseUrl}/nodeinfo/2.1`,
      },
    ],
  });
});

webfingerRoutes.get('/nodeinfo/2.1', (c) => {
  return c.json({
    version: '2.1',
    software: {
      name: 'federvise',
      version: '0.1.0',
    },
    protocols: ['activitypub'],
    usage: {
      users: {
        total: 1,
        activeMonth: 1,
        activeHalfyear: 1,
      },
      localPosts: 0, // TODO: 从数据库获取
    },
    openRegistrations: false,
  });
});
