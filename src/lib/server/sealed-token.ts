import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_SECRET must be at least 32 characters");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

/** AES-256-GCM envelope. Tokens are only decrypted in server modules. */
export function sealToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function openToken(envelope: string): string {
  const [version, iv, tag, payload] = envelope.split(".");
  if (version !== "v1" || !iv || !tag || !payload) throw new Error("Invalid token envelope");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
