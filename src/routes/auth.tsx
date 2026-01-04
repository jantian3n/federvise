/**
 * 登录/登出路由
 */
import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { Layout } from '../views/Layout.js';
import { login, destroySession } from '../services/auth.js';
import { SESSION_COOKIE } from '../middleware/auth.js';

export const authRoutes = new Hono();

// 登录页面
authRoutes.get('/login', async (c) => {
  const error = c.req.query('error');

  const content = (
    <div style="max-width: 400px; margin: 0 auto;">
      <h1>Login</h1>

      {error && (
        <div style="background: #fee2e2; color: #dc2626; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
          Invalid credentials. Please try again.
        </div>
      )}

      <form method="post" action="/login" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Password</label>
          <input
            type="password"
            name="password"
            required
            autofocus
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1rem; background: var(--bg); color: var(--text);"
          />
        </div>

        <div>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">2FA Code</label>
          <input
            type="text"
            name="totpToken"
            placeholder="000000"
            required
            pattern="[0-9]{6}"
            maxLength={6}
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 1.25rem; text-align: center; letter-spacing: 0.5rem; background: var(--bg); color: var(--text);"
          />
          <small style="color: var(--text-secondary);">Enter the 6-digit code from your authenticator app</small>
        </div>

        <button
          type="submit"
          style="background: var(--accent); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; margin-top: 0.5rem;"
        >
          Login
        </button>
      </form>

      <p style="margin-top: 2rem; text-align: center;">
        <a href="/">← Back to Home</a>
      </p>
    </div>
  );

  return c.html(
    <Layout title="Login">
      {content}
    </Layout>
  );
});

// 处理登录
authRoutes.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const password = body.password as string;
  const totpToken = body.totpToken as string;

  const result = await login(password, totpToken);

  if (!result.success || !result.token) {
    return c.redirect('/login?error=1');
  }

  // 设置 Cookie
  setCookie(c, SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return c.redirect('/');
});

// 登出
authRoutes.post('/logout', async (c) => {
  const { getCookie } = await import('hono/cookie');
  const token = getCookie(c, SESSION_COOKIE);

  if (token) {
    await destroySession(token);
  }

  deleteCookie(c, SESSION_COOKIE, { path: '/' });

  return c.redirect('/');
});

// GET 方式登出（方便用户）
authRoutes.get('/logout', async (c) => {
  const { getCookie } = await import('hono/cookie');
  const token = getCookie(c, SESSION_COOKIE);

  if (token) {
    await destroySession(token);
  }

  deleteCookie(c, SESSION_COOKIE, { path: '/' });

  return c.redirect('/');
});
