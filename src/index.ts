import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { config, loadConfigFromDb } from './config.js';
import { blogRoutes } from './routes/blog.js';
import { feedRoutes } from './routes/feed.js';
import { webfingerRoutes } from './routes/webfinger.js';
import { actorRoutes } from './routes/actor.js';
import { inboxRoutes } from './routes/inbox.js';
import { adminRoutes } from './routes/admin.js';
import { setupRoutes } from './routes/setup.js';
import { authRoutes } from './routes/auth.js';
import { isInitialized } from './services/config.js';
import { getDb } from './db/index.js';
import { schema } from './db/schema.js';

async function main() {
  // 初始化数据库表
  const db = await getDb();
  db.run(schema);

  // 检查是否已初始化
  const initialized = await isInitialized();

  if (initialized) {
    // 从数据库加载配置
    await loadConfigFromDb();
  }

  const app = new Hono();

  // 中间件
  app.use('*', logger());

  if (!initialized) {
    // 未初始化：只挂载 setup 路由
    app.route('/', setupRoutes);

    // 其他所有路由重定向到 /setup
    app.all('*', (c) => {
      const path = c.req.path;
      if (!path.startsWith('/setup')) {
        return c.redirect('/setup');
      }
      return c.notFound();
    });
  } else {
    // 已初始化：挂载所有路由

    // Setup 路由（已初始化时会重定向到首页）
    app.route('/', setupRoutes);

    // 认证路由
    app.route('/', authRoutes);

    // ActivityPub 路由（优先级高）
    app.route('/', webfingerRoutes);
    app.route('/', actorRoutes);
    app.route('/', inboxRoutes);

    // 博客路由
    app.route('/', blogRoutes);
    app.route('/', feedRoutes);

    // 管理后台
    app.route('/', adminRoutes);
  }

  // 健康检查
  app.get('/health', (c) => {
    return c.json({ status: 'ok', initialized });
  });

  // 启动服务器
  console.log(`Starting server on port ${config.port}...`);
  console.log(`Domain: ${config.domain}`);
  console.log(`Actor: ${config.actorId}`);
  console.log(`Local URL: http://localhost:${config.port}`);
  console.log(`Initialized: ${initialized}`);

  if (!initialized) {
    console.log(`\n=> Visit http://localhost:${config.port}/setup to complete setup\n`);
  }

  serve({
    fetch: app.fetch,
    port: config.port,
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
