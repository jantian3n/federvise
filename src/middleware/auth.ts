/**
 * 认证中间件
 */
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifySession } from '../services/auth.js';

const SESSION_COOKIE = 'federvise_session';

/**
 * 检查登录状态的中间件（不强制要求登录）
 * 设置 c.set('isLoggedIn', boolean)
 */
export async function checkAuth(c: Context, next: Next): Promise<void | Response> {
  const token = getCookie(c, SESSION_COOKIE);

  if (token) {
    const valid = await verifySession(token);
    c.set('isLoggedIn', valid);
  } else {
    c.set('isLoggedIn', false);
  }

  await next();
}

/**
 * 要求登录的中间件
 * 未登录时重定向到登录页
 */
export async function requireAuth(c: Context, next: Next): Promise<void | Response> {
  const token = getCookie(c, SESSION_COOKIE);

  if (!token) {
    return c.redirect('/login');
  }

  const valid = await verifySession(token);
  if (!valid) {
    return c.redirect('/login');
  }

  c.set('isLoggedIn', true);
  await next();
}

/**
 * API 认证中间件（支持 Session Cookie 或 Bearer Token）
 */
export async function apiAuth(c: Context, next: Next): Promise<void | Response> {
  // 先检查 Cookie
  const cookieToken = getCookie(c, SESSION_COOKIE);
  if (cookieToken) {
    const valid = await verifySession(cookieToken);
    if (valid) {
      await next();
      return;
    }
  }

  // 再检查 Bearer Token（兼容旧的 API 调用）
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { config } = await import('../config.js');
    const token = authHeader.substring(7);
    if (token === config.adminPassword) {
      await next();
      return;
    }
  }

  return c.json({ error: 'Unauthorized' }, 401);
}

export { SESSION_COOKIE };
