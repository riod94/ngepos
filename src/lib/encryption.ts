import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export interface EncryptedData {
  iv: string;
  encryptedData: string;
  tag: string;
  salt: string;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

export function encrypt(text: string, password?: string): EncryptedData {
  const keyPassword = password || getDefaultEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(keyPassword, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted,
    tag: tag.toString("hex"),
    salt: salt.toString("hex"),
  };
}

export function decrypt(encrypted: EncryptedData, password?: string): string {
  const keyPassword = password || getDefaultEncryptionKey();
  const salt = Buffer.from(encrypted.salt, "hex");
  const key = deriveKey(keyPassword, salt);
  const iv = Buffer.from(encrypted.iv, "hex");
  const tag = Buffer.from(encrypted.tag, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function encryptObject<T extends Record<string, any>>(
  obj: T,
  sensitiveFields: (keyof T)[],
  password?: string
): T {
  const encrypted = { ...obj };

  for (const field of sensitiveFields) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      const value = typeof encrypted[field] === "object"
        ? JSON.stringify(encrypted[field])
        : String(encrypted[field]);

      const encryptedValue = encrypt(value, password);
      encrypted[field] = JSON.stringify(encryptedValue) as T[keyof T];
    }
  }

  return encrypted;
}

export function decryptObject<T extends Record<string, any>>(
  encryptedObj: T,
  sensitiveFields: (keyof T)[],
  password?: string
): T {
  const decrypted = { ...encryptedObj };

  for (const field of sensitiveFields) {
    if (decrypted[field] !== undefined && decrypted[field] !== null) {
      try {
        const encryptedValue = JSON.parse(decrypted[field] as string) as EncryptedData;
        const decryptedValue = decrypt(encryptedValue, password);

        try {
          decrypted[field] = JSON.parse(decryptedValue) as T[keyof T];
        } catch {
          decrypted[field] = decryptedValue as T[keyof T];
        }
      } catch (e) {
        console.warn(`Failed to decrypt field ${String(field)}:`, e);
      }
    }
  }

  return decrypted;
}

let defaultKey: string | null = null;

function getDefaultEncryptionKey(): string {
  if (defaultKey) return defaultKey;

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("ngepos_encryption_key");
    if (stored) {
      defaultKey = stored;
      return defaultKey;
    }

    defaultKey = crypto.randomBytes(32).toString("hex");
    localStorage.setItem("ngepos_encryption_key", defaultKey);
    return defaultKey;
  }

  defaultKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
  return defaultKey;
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function hashSensitiveData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export const SENSITIVE_FIELDS_TRANSACTION = [
  "receiptNumber",
  "paymentMethod",
  "cashierName",
] as const;

export const SENSITIVE_FIELDS_STAFF = [
  "password",
  "pin",
  "otpCode",
] as const;

export const SENSITIVE_FIELDS_CUSTOMER = [
  "phone",
  "email",
] as const;
