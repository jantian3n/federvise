import { request } from 'undici';
import { config } from '../config.js';
import { getDb, saveDb } from '../db/index.js';
import { signRequest, parseSignatureHeader, verifySignature } from './crypto.js';
import { AP_ACCEPT, AP_CONTENT_TYPE } from '../utils/activitypub.js';

// 获取远程 Actor 信息
export async function fetchActor(actorId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await request(actorId, {
      method: 'GET',
      headers: {
        Accept: AP_ACCEPT,
        'User-Agent': `Federvise/0.1.0 (+${config.baseUrl})`,
      },
    });

    if (response.statusCode !== 200) {
      console.error(`Failed to fetch actor ${actorId}: ${response.statusCode}`);
      return null;
    }

    return await response.body.json() as Record<string, unknown>;
  } catch (error) {
    console.error(`Error fetching actor ${actorId}:`, error);
    return null;
  }
}

// 获取用户私钥
async function getPrivateKey(): Promise<string | null> {
  const db = await getDb();
  const result = db.exec(`SELECT private_key FROM users WHERE username = '${config.username}'`);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return result[0].values[0][0] as string;
}

// 发送签名的 POST 请求
export async function signedPost(url: string, body: object): Promise<boolean> {
  const privateKey = await getPrivateKey();
  if (!privateKey) {
    console.error('No private key found');
    return false;
  }

  const bodyString = JSON.stringify(body);
  const signature = signRequest('POST', url, privateKey, config.publicKeyId, bodyString, AP_CONTENT_TYPE);

  try {
    const response = await request(url, {
      method: 'POST',
      headers: {
        Host: signature.host,
        Date: signature.date,
        Digest: signature.digest!,
        Signature: signature.signature,
        'Content-Type': AP_CONTENT_TYPE,
        Accept: AP_ACCEPT,
        'User-Agent': `Federvise/0.1.0 (+${config.baseUrl})`,
      },
      body: bodyString,
    });

    console.log(`POST ${url} -> ${response.statusCode}`);
    return response.statusCode >= 200 && response.statusCode < 300;
  } catch (error) {
    console.error(`Error posting to ${url}:`, error);
    return false;
  }
}

// 处理 Follow 请求
export async function handleFollow(activity: Record<string, unknown>): Promise<boolean> {
  const actorId = activity.actor as string;
  const objectId = activity.object as string;

  // 验证 object 是我们自己
  if (objectId !== config.actorId) {
    console.log(`Follow request for unknown actor: ${objectId}`);
    return false;
  }

  console.log(`Received Follow from: ${actorId}`);

  // 获取关注者信息
  const actor = await fetchActor(actorId);
  if (!actor) {
    console.error(`Could not fetch actor: ${actorId}`);
    return false;
  }

  const inbox = actor.inbox as string;
  const sharedInbox = (actor.endpoints as Record<string, unknown>)?.sharedInbox as string || null;

  // 保存关注者
  const db = await getDb();
  try {
    db.run(`
      INSERT OR REPLACE INTO followers (actor_id, inbox, shared_inbox)
      VALUES (?, ?, ?)
    `, [actorId, inbox, sharedInbox]);
    saveDb();
    console.log(`Saved follower: ${actorId}`);
  } catch (error) {
    console.error(`Error saving follower:`, error);
    return false;
  }

  // 发送 Accept
  const acceptActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${config.actorId}#accepts/follows/${Date.now()}`,
    type: 'Accept',
    actor: config.actorId,
    object: activity,
  };

  const success = await signedPost(inbox, acceptActivity);
  if (success) {
    console.log(`Sent Accept to: ${inbox}`);
  }

  // 记录活动
  db.run(`
    INSERT INTO activities (type, actor, object, raw, direction)
    VALUES (?, ?, ?, ?, ?)
  `, ['Follow', actorId, objectId, JSON.stringify(activity), 'inbound']);
  saveDb();

  return success;
}

// 处理 Undo 请求（取消关注）
export async function handleUndo(activity: Record<string, unknown>): Promise<boolean> {
  const actorId = activity.actor as string;
  const object = activity.object as Record<string, unknown>;

  if (object.type !== 'Follow') {
    console.log(`Ignoring Undo for type: ${object.type}`);
    return false;
  }

  console.log(`Received Unfollow from: ${actorId}`);

  // 删除关注者
  const db = await getDb();
  db.run(`DELETE FROM followers WHERE actor_id = ?`, [actorId]);
  saveDb();

  // 记录活动
  db.run(`
    INSERT INTO activities (type, actor, object, raw, direction)
    VALUES (?, ?, ?, ?, ?)
  `, ['Undo', actorId, JSON.stringify(object), JSON.stringify(activity), 'inbound']);
  saveDb();

  console.log(`Removed follower: ${actorId}`);
  return true;
}
