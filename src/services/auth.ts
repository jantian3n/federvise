/**
 * 认证服务 - 密码、TOTP、会话管理
 */
import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { getDb, saveDb } from '../db/index.js';

const BCRYPT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 7;

// ============== 密码 ==============

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============== TOTP ==============

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export async function generateTotpQrCode(secret: string, username: string, domain: string): Promise<string> {
  const otpauth = authenticator.keyuri(username, domain, secret);
  return QRCode.toDataURL(otpauth);
}

export function verifyTotp(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}

// ============== 凭证管理 ==============

export async function createCredentials(passwordHash: string, totpSecret: string): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT INTO credentials (password_hash, totp_secret, totp_enabled, created_at) VALUES (?, ?, 1, datetime('now'))`,
    [passwordHash, totpSecret]
  );
  saveDb();
}

export async function getCredentials(): Promise<{
  passwordHash: string;
  totpSecret: string | null;
  totpEnabled: boolean;
} | null> {
  const db = await getDb();
  const result = db.exec(`SELECT password_hash, totp_secret, totp_enabled FROM credentials LIMIT 1`);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  const [passwordHash, totpSecret, totpEnabled] = result[0].values[0];
  return {
    passwordHash: passwordHash as string,
    totpSecret: totpSecret as string | null,
    totpEnabled: Boolean(totpEnabled),
  };
}

export async function hasCredentials(): Promise<boolean> {
  const creds = await getCredentials();
  return creds !== null;
}

// ============== 会话管理 ==============

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  db.run(
    `INSERT INTO sessions (token, expires_at, last_activity) VALUES (?, ?, datetime('now'))`,
    [token, expiresAt.toISOString()]
  );
  saveDb();

  return { token, expiresAt };
}

export async function verifySession(token: string): Promise<boolean> {
  const db = await getDb();
  const result = db.exec(
    `SELECT id FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
    [token]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return false;
  }

  // 更新最后活动时间
  db.run(`UPDATE sessions SET last_activity = datetime('now') WHERE token = ?`, [token]);
  saveDb();

  return true;
}

export async function destroySession(token: string): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
  saveDb();
}

export async function cleanExpiredSessions(): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM sessions WHERE expires_at < datetime('now')`);
  saveDb();
}

// ============== 登录验证 ==============

export async function login(password: string, totpToken: string): Promise<{ success: boolean; token?: string; expiresAt?: Date; error?: string }> {
  const creds = await getCredentials();

  if (!creds) {
    return { success: false, error: 'Not initialized' };
  }

  // 验证密码
  const passwordValid = await verifyPassword(password, creds.passwordHash);
  if (!passwordValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  // 验证 TOTP
  if (creds.totpEnabled && creds.totpSecret) {
    const totpValid = verifyTotp(creds.totpSecret, totpToken);
    if (!totpValid) {
      return { success: false, error: 'Invalid credentials' };
    }
  }

  // 创建会话
  const session = await createSession();
  return {
    success: true,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}
