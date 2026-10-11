import type { ContribId } from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 20;
/** Largest multiple of 62 below 256: bytes at or above it are rejected so every symbol is equally likely. */
const LIMIT = 248;

/** 20 random base62 characters. Uses the Web Crypto API (browsers and Node 22). */
export function newContribId(): ContribId {
  let out = "";
  while (out.length < ID_LENGTH) {
    const bytes = new Uint8Array(ID_LENGTH * 2);
    globalThis.crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b >= LIMIT || out.length >= ID_LENGTH) continue;
      out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isContribId(s: unknown): s is ContribId {
  return typeof s === "string" && ID_PATTERN.test(s);
}
