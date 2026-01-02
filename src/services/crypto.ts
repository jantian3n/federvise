import { generateKeyPairSync, createSign, createVerify, createHash } from 'node:crypto';

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

// HTTP Signatures 签名
export interface SignatureHeaders {
  host: string;
  date: string;
  digest?: string;
  signature: string;
}

export function signRequest(
  method: string,
  url: string,
  privateKey: string,
  keyId: string,
  body?: string
): SignatureHeaders {
  const urlObj = new URL(url);
  const host = urlObj.host;
  const path = urlObj.pathname;
  const date = new Date().toUTCString();

  // 构建签名头列表
  const headers: string[] = ['(request-target)', 'host', 'date'];
  const signingParts: string[] = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ${host}`,
    `date: ${date}`,
  ];

  let digest: string | undefined;

  // 如果有 body，添加 digest
  if (body) {
    const hash = createHash('sha256').update(body).digest('base64');
    digest = `SHA-256=${hash}`;
    headers.push('digest');
    signingParts.push(`digest: ${digest}`);
  }

  // 构建签名字符串
  const signingString = signingParts.join('\n');

  // 使用私钥签名
  const signer = createSign('sha256');
  signer.update(signingString);
  const signature = signer.sign(privateKey, 'base64');

  // 构建 Signature header
  const signatureHeader = [
    `keyId="${keyId}"`,
    `algorithm="rsa-sha256"`,
    `headers="${headers.join(' ')}"`,
    `signature="${signature}"`,
  ].join(',');

  return {
    host,
    date,
    digest,
    signature: signatureHeader,
  };
}

// 解析 Signature header
export function parseSignatureHeader(header: string): {
  keyId: string;
  algorithm: string;
  headers: string[];
  signature: string;
} | null {
  const parts: Record<string, string> = {};

  // 解析 key="value" 格式
  const regex = /(\w+)="([^"]+)"/g;
  let match;
  while ((match = regex.exec(header)) !== null) {
    parts[match[1]] = match[2];
  }

  if (!parts.keyId || !parts.signature || !parts.headers) {
    return null;
  }

  return {
    keyId: parts.keyId,
    algorithm: parts.algorithm || 'rsa-sha256',
    headers: parts.headers.split(' '),
    signature: parts.signature,
  };
}

// 验证 HTTP Signature
export function verifySignature(
  method: string,
  path: string,
  headers: Record<string, string>,
  publicKey: string,
  signatureData: {
    headers: string[];
    signature: string;
  }
): boolean {
  try {
    // 构建签名字符串
    const signingParts = signatureData.headers.map(header => {
      if (header === '(request-target)') {
        return `(request-target): ${method.toLowerCase()} ${path}`;
      }
      const value = headers[header.toLowerCase()];
      if (!value) {
        throw new Error(`Missing header: ${header}`);
      }
      return `${header.toLowerCase()}: ${value}`;
    });

    const signingString = signingParts.join('\n');

    // 验证签名
    const verifier = createVerify('sha256');
    verifier.update(signingString);
    return verifier.verify(publicKey, signatureData.signature, 'base64');
  } catch {
    return false;
  }
}

// 计算 body 的 digest
export function calculateDigest(body: string): string {
  const hash = createHash('sha256').update(body).digest('base64');
  return `SHA-256=${hash}`;
}
