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
  console.log('[Main] Starting server...');

  // 初始化数据库表
  const db = await getDb();
  console.log('[Main] Database loaded');
  db.run(schema);
  console.log('[Main] Schema executed');

  // 检查是否已初始化
  console.log('[Main] Checking initialization...');
  const initialized = await isInitialized();
  console.log('[Main] Initialization result:', initialized);

  if (initialized) {
    // 从数据库加载配置
    await loadConfigFromDb();
  }

  const app = new Hono();

  // 中间件
  app.use('*', logger());

  // 健康检查（始终可用）
  app.get('/health', (c) => {
    return c.json({ status: 'ok', initialized });
  });

  // 调试端点 - 查看数据库状态（始终可用）
  app.get('/debug/db', async (c) => {
    const db = await getDb();
    const tables = db.exec(`SELECT name FROM sqlite_master WHERE type='table'`);
    const siteConfig = db.exec(`SELECT * FROM site_config`);
    const credentials = db.exec(`SELECT id, totp_enabled, created_at FROM credentials`);
    const sessions = db.exec(`SELECT id, created_at, expires_at FROM sessions`);
    const users = db.exec(`SELECT id, username, display_name FROM users`);

    return c.json({
      tables: tables.length > 0 ? tables[0].values : [],
      site_config: siteConfig.length > 0 ? siteConfig[0].values : [],
      credentials: credentials.length > 0 ? credentials[0].values : [],
      sessions: sessions.length > 0 ? sessions[0].values : [],
      users: users.length > 0 ? users[0].values : [],
      initialized_check: await isInitialized(),
    });
  });

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
