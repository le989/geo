import crypto from "crypto";

function getSecret() {
  const secret =
    process.env.MODEL_KEY_SECRET ||
    process.env.WORKBENCH_PASSWORD ||
    "";
  if (!secret) {
    throw new Error("MODEL_KEY_SECRET is not configured");
  }
  return secret;
}

function getKey() {
  const secret = getSecret();
  return crypto.scryptSync(secret, "geo-factory-model-key", 32);
}

export function encryptApiKey(plain: string) {
  if (!plain) return "";
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptApiKey(value: string) {
  if (!value) return "";
  if (!value.startsWith("enc:v1:")) {
    return value;
  }
  const [, , ivB64, tagB64, dataB64] = value.split(":");
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

