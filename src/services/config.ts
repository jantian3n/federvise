/**
 * 配置服务 - 从数据库读写站点配置
 */
import { getDb, saveDb } from '../db/index.js';

export interface SiteConfig {
  domain: string;
  username: string;
  displayName: string;
  summary: string;
  port: number;
}

const defaults: SiteConfig = {
  domain: 'example.com',
  username: 'blog',
  displayName: 'My Blog',
  summary: 'A personal blog powered by ActivityPub',
  port: 3000,
};

/**
 * 获取单个配置项
 */
export async function getConfigValue(key: string): Promise<string | null> {
  const db = await getDb();
  // sql.js exec 不支持参数化查询，需要用 prepare
  const stmt = db.prepare(`SELECT value FROM site_config WHERE key = $key`);
  stmt.bind({ $key: key });

  if (stmt.step()) {
    const value = stmt.get()[0] as string;
    stmt.free();
    return value;
  }

  stmt.free();
  return null;
}

/**
 * 设置配置项
 */
export async function setConfigValue(key: string, value: string): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)`,
    [key, value]
  );
  saveDb();
}

/**
 * 检查是否已初始化
 */
export async function isInitialized(): Promise<boolean> {
  const initialized = await getConfigValue('initialized_at');
  return initialized !== null;
}

/**
 * 获取所有站点配置
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  const db = await getDb();
  const result = db.exec(`SELECT key, value FROM site_config`);

  const config: Record<string, string> = {};
  if (result.length > 0) {
    for (const row of result[0].values) {
      config[row[0] as string] = row[1] as string;
    }
  }

  return {
    domain: config.domain || process.env.DOMAIN || defaults.domain,
    username: config.username || process.env.USERNAME || defaults.username,
    displayName: config.display_name || process.env.DISPLAY_NAME || defaults.displayName,
    summary: config.summary || process.env.SUMMARY || defaults.summary,
    port: parseInt(config.port || process.env.PORT || String(defaults.port), 10),
  };
}

/**
 * 保存站点配置（初始化时使用）
 */
export async function saveSiteConfig(config: Partial<SiteConfig>): Promise<void> {
  if (config.domain) await setConfigValue('domain', config.domain);
  if (config.username) await setConfigValue('username', config.username);
  if (config.displayName) await setConfigValue('display_name', config.displayName);
  if (config.summary) await setConfigValue('summary', config.summary);
  if (config.port) await setConfigValue('port', String(config.port));

  await setConfigValue('initialized_at', new Date().toISOString());
}
