/**
 * 初始化向导路由
 */
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { Layout } from '../views/Layout.js';
import { isInitialized, saveSiteConfig } from '../services/config.js';
import {
  hashPassword,
  generateTotpSecret,
  generateTotpQrCode,
  verifyTotp,
  createCredentials,
  createSession,
} from '../services/auth.js';
import { updateConfig } from '../config.js';
import { getDb, saveDb } from '../db/index.js';
import { schema } from '../db/schema.js';
import { generateKeyPair } from '../services/crypto.js';
import { SESSION_COOKIE } from '../middleware/auth.js';

export const setupRoutes = new Hono();

// 临时存储 setup 过程中的数据
const setupState: {
  domain?: string;
  username?: string;
  displayName?: string;
  summary?: string;
  passwordHash?: string;
  totpSecret?: string;
} = {};

// 步骤 1: 站点信息
setupRoutes.get('/setup', async (c) => {
  if (await isInitialized()) {
    return c.redirect('/');
  }

  const content = (
    <div style="max-width: 500px; margin: 0 auto;">
      <h1>Welcome to Federvise</h1>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">
        Let's set up your ActivityPub blog. This will only take a minute.
      </p>

      <form method="post" action="/setup" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Domain *</label>
          <input
            type="text"
            name="domain"
            placeholder="blog.example.com"
            required
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; background: var(--bg); color: var(--text);"
          />
          <small style="color: var(--text-secondary);">Your blog's domain (without https://)</small>
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Username *</label>
          <input
            type="text"
            name="username"
            placeholder="blog"
            required
            pattern="[a-z0-9_]+"
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; background: var(--bg); color: var(--text);"
          />
          <small style="color: var(--text-secondary);">Your Fediverse handle (lowercase, no spaces)</small>
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Display Name *</label>
          <input
            type="text"
            name="displayName"
            placeholder="My Blog"
            required
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; background: var(--bg); color: var(--text);"
          />
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Bio</label>
          <textarea
            name="summary"
            placeholder="A personal blog about..."
            rows={3}
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; resize: vertical; background: var(--bg); color: var(--text);"
          />
        </div>

        <button
          type="submit"
          style="background: var(--accent); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 1rem;"
        >
          Continue →
        </button>
      </form>
    </div>
  );

  return c.html(
    <Layout title="Setup">
      {content}
    </Layout>
  );
});

// 处理步骤 1，显示步骤 2
setupRoutes.post('/setup', async (c) => {
  if (await isInitialized()) {
    return c.redirect('/');
  }

  const body = await c.req.parseBody();
  setupState.domain = body.domain as string;
  setupState.username = (body.username as string).toLowerCase();
  setupState.displayName = body.displayName as string;
  setupState.summary = (body.summary as string) || '';

  const content = (
    <div style="max-width: 500px; margin: 0 auto;">
      <h1>Set Password</h1>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">
        Choose a strong password for your admin account.
      </p>

      <form method="post" action="/setup/password" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Password *</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; background: var(--bg); color: var(--text);"
          />
          <small style="color: var(--text-secondary);">At least 8 characters</small>
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Confirm Password *</label>
          <input
            type="password"
            name="confirmPassword"
            required
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; background: var(--bg); color: var(--text);"
          />
        </div>

        <button
          type="submit"
          style="background: var(--accent); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 1rem;"
        >
          Continue →
        </button>
      </form>
    </div>
  );

  return c.html(
    <Layout title="Set Password">
      {content}
    </Layout>
  );
});

// 处理步骤 2，显示步骤 3 (TOTP)
setupRoutes.post('/setup/password', async (c) => {
  if (await isInitialized()) {
    return c.redirect('/');
  }

  const body = await c.req.parseBody();
  const password = body.password as string;
  const confirmPassword = body.confirmPassword as string;

  if (password !== confirmPassword) {
    return c.html(
      <Layout title="Error">
        <div style="max-width: 500px; margin: 0 auto;">
          <h1>Passwords don't match</h1>
          <p><a href="/setup">← Go back</a></p>
        </div>
      </Layout>
    );
  }

  if (password.length < 8) {
    return c.html(
      <Layout title="Error">
        <div style="max-width: 500px; margin: 0 auto;">
          <h1>Password too short</h1>
          <p>Password must be at least 8 characters.</p>
          <p><a href="/setup">← Go back</a></p>
        </div>
      </Layout>
    );
  }

  setupState.passwordHash = await hashPassword(password);
  setupState.totpSecret = generateTotpSecret();

  const qrCodeDataUrl = await generateTotpQrCode(
    setupState.totpSecret,
    setupState.username || 'admin',
    setupState.domain || 'federvise'
  );

  const content = (
    <div style="max-width: 500px; margin: 0 auto;">
      <h1>Two-Factor Authentication</h1>
      <p style="color: var(--text-secondary); margin-bottom: 1rem;">
        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
      </p>

      <div style="text-align: center; margin: 2rem 0;">
        <img src={qrCodeDataUrl} alt="TOTP QR Code" style="border-radius: 8px;" />
      </div>

      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
        Or enter this code manually: <code style="background: var(--border); padding: 0.25rem 0.5rem; border-radius: 4px;">{setupState.totpSecret}</code>
      </p>

      <form method="post" action="/setup/totp" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Verification Code *</label>
          <input
            type="text"
            name="totpToken"
            placeholder="000000"
            required
            pattern="[0-9]{6}"
            maxLength={6}
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1.5rem; text-align: center; letter-spacing: 0.5rem; background: var(--bg); color: var(--text);"
          />
          <small style="color: var(--text-secondary);">Enter the 6-digit code from your app</small>
        </div>

        <button
          type="submit"
          style="background: var(--accent); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 1rem;"
        >
          Complete Setup
        </button>
      </form>
    </div>
  );

  return c.html(
    <Layout title="2FA Setup">
      {content}
    </Layout>
  );
});

// 处理步骤 3，完成设置
setupRoutes.post('/setup/totp', async (c) => {
  if (await isInitialized()) {
    return c.redirect('/');
  }

  const body = await c.req.parseBody();
  const totpToken = body.totpToken as string;

  if (!setupState.totpSecret || !verifyTotp(setupState.totpSecret, totpToken)) {
    return c.html(
      <Layout title="Error">
        <div style="max-width: 500px; margin: 0 auto;">
          <h1>Invalid Code</h1>
          <p>The verification code is incorrect. Please try again.</p>
          <p><a href="/setup">← Start over</a></p>
        </div>
      </Layout>
    );
  }

  // 初始化数据库表
  const db = await getDb();
  db.run(schema);

  // 保存站点配置
  await saveSiteConfig({
    domain: setupState.domain,
    username: setupState.username,
    displayName: setupState.displayName,
    summary: setupState.summary,
  });

  // 更新运行时配置
  updateConfig({
    domain: setupState.domain,
    username: setupState.username,
    displayName: setupState.displayName,
    summary: setupState.summary,
  });

  // 生成 RSA 密钥对
  const { publicKey, privateKey } = await generateKeyPair();

  // 创建 ActivityPub 用户
  db.run(
    `INSERT INTO users (username, display_name, summary, public_key, private_key) VALUES (?, ?, ?, ?, ?)`,
    [setupState.username || '', setupState.displayName || '', setupState.summary || '', publicKey, privateKey]
  );

  // 保存凭证
  await createCredentials(setupState.passwordHash!, setupState.totpSecret);

  saveDb();

  // 创建会话并登录
  const session = await createSession();

  // 清理临时状态
  Object.keys(setupState).forEach((key) => delete (setupState as Record<string, unknown>)[key]);

  // 设置 Cookie
  setCookie(c, SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return c.redirect('/');
});
