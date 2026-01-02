import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { config } from './config.js';
import { blogRoutes } from './routes/blog.js';
import { feedRoutes } from './routes/feed.js';
import { webfingerRoutes } from './routes/webfinger.js';
import { actorRoutes } from './routes/actor.js';
import { inboxRoutes } from './routes/inbox.js';
import { adminRoutes } from './routes/admin.js';

const app = new Hono();

// 中间件
app.use('*', logger());

// ActivityPub 路由（优先级高）
app.route('/', webfingerRoutes);
app.route('/', actorRoutes);
app.route('/', inboxRoutes);

// 博客路由
app.route('/', blogRoutes);
app.route('/', feedRoutes);

// 管理后台
app.route('/', adminRoutes);

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// 启动服务器
console.log(`Starting server on port ${config.port}...`);
console.log(`Domain: ${config.domain}`);
console.log(`Actor: ${config.actorId}`);
console.log(`Local URL: http://localhost:${config.port}`);

serve({
  fetch: app.fetch,
  port: config.port,
});
