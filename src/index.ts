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
  let initialized = await isInitialized();
  console.log('[Main] Initialization result:', initialized);

  if (initialized) {
    // 从数据库加载配置
    await loadConfigFromDb();
  }

  const app = new Hono();

  // 中间件
  app.use('*', logger());

  // 健康检查（始终可用）
  app.get('/health', async (c) => {
    const currentlyInitialized = await isInitialized();
    return c.json({ status: 'ok', initialized: currentlyInitialized });
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

  // Setup 路由（始终挂载）
  app.route('/', setupRoutes);

  // 动态初始化检查中间件
  // 如果未初始化，重定向非 setup 路由到 /setup
  app.use('*', async (c, next) => {
    const path = c.req.path;

    // 跳过 setup、health、debug 路由
    if (path.startsWith('/setup') || path === '/health' || path.startsWith('/debug')) {
      return next();
    }

    // 动态检查初始化状态
    const currentlyInitialized = await isInitialized();

    if (!currentlyInitialized) {
      console.log(`[Middleware] Not initialized, redirecting ${path} to /setup`);
      return c.redirect('/setup');
    }

    // 如果刚初始化但配置未加载，重新加载
    if (currentlyInitialized && !initialized) {
      console.log('[Middleware] Newly initialized, reloading config...');
      await loadConfigFromDb();
      initialized = true; // 更新状态
    }

    return next();
  });

  // 认证路由
  app.route('/', authRoutes);

  // ActivityPub 路由
  app.route('/', webfingerRoutes);
  app.route('/', actorRoutes);
  app.route('/', inboxRoutes);

  // 博客路由
  app.route('/', blogRoutes);
  app.route('/', feedRoutes);

  // 管理后台
  app.route('/', adminRoutes);

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
