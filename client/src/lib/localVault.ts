/*
H 1.0 Pro local vault utility
- 用于 Telegram Mini App 前端本地金库模式
- 仅在浏览器端运行
- 私钥不上传，仅以加密形式写入本地存储
*/

import { Wallet } from "ethers";

const LOCAL_VAULT_STORAGE_KEY = "h1pro.local_vault.encrypted";
const SESSION_CIPHER_KEY = "h1pro.local_vault.session_key";

export type WalletMode = "detecting" | "okx_wallet" | "local_vault";

export type LocalVaultRecord = {
  address: string;
  privateKey: string;
  createdAt: string;
  mode: "local_vault";
};

type EncryptedPayload = {
  iv: string;
  cipher: string;
};

function ensureBrowser() {
  if (typeof window === "undefined" || typeof crypto === "undefined") {
    throw new Error("Local vault is only available in browser runtime.");
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function getOrCreateSessionKeyRaw() {
  ensureBrowser();

  const existing = window.sessionStorage.getItem(SESSION_CIPHER_KEY);
  if (existing) {
    return base64ToBytes(existing);
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  window.sessionStorage.setItem(SESSION_CIPHER_KEY, bytesToBase64(raw));
  return raw;
}

async function getCipherKey() {
  const raw = getOrCreateSessionKeyRaw();
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptPayload(value: string): Promise<EncryptedPayload> {
  ensureBrowser();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getCipherKey();
  const encoded = new TextEncoder().encode(value);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(new Uint8Array(cipherBuffer)),
  };
}

async function decryptPayload(payload: EncryptedPayload) {
  ensureBrowser();
  const key = await getCipherKey();
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.cipher),
  );

  return new TextDecoder().decode(plainBuffer);
}

export function detectOkxWallet() {
  if (typeof window === "undefined") return false;

  const win = window as Window & {
    okxwallet?: unknown;
    ethereum?: { isOkxWallet?: boolean };
  };

  return Boolean(win.okxwallet) || Boolean(win.ethereum?.isOkxWallet);
}

export function maskAddress(address: string, left = 6, right = 4) {
  if (!address) return "";
  if (address.length <= left + right) return address;
  return `${address.slice(0, left)}...${address.slice(-right)}`;
}

export async function loadLocalVault(): Promise<LocalVaultRecord | null> {
  ensureBrowser();

  const raw = window.localStorage.getItem(LOCAL_VAULT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as EncryptedPayload;
    const decrypted = await decryptPayload(payload);
    return JSON.parse(decrypted) as LocalVaultRecord;
  } catch {
    return null;
  }
}

export async function deriveOrLoadLocalVault(): Promise<LocalVaultRecord> {
  ensureBrowser();

  const existing = await loadLocalVault();
  if (existing) return existing;

  const wallet = Wallet.createRandom();
  const record: LocalVaultRecord = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    createdAt: new Date().toISOString(),
    mode: "local_vault",
  };

  const payload = await encryptPayload(JSON.stringify(record));
  window.localStorage.setItem(LOCAL_VAULT_STORAGE_KEY, JSON.stringify(payload));
  return record;
}

export function clearLocalVault() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_VAULT_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_CIPHER_KEY);
}

export async function resolveWalletMode() {
  if (detectOkxWallet()) {
    return { mode: "okx_wallet" as const, vault: null };
  }

  const vault = await deriveOrLoadLocalVault();
  return { mode: "local_vault" as const, vault };
}
