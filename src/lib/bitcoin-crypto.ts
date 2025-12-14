// Bitcoin Crypto Utilities for Brain Wallet Analysis
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';

export const N_CURVE_HEX = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141';
export const N_CURVE = BigInt('0x' + N_CURVE_HEX);
export const KEYS_PER_PAGE = 10n;
export const WIF_COMPRESSED_PREFIX = 0x80;
export const ADDRESS_PREFIX = 0x00;
export const API_BASE = 'https://blockstream.info/api/address/';
export const LAST_PAGE = 2573157538607026564968244111304175730063056983979442319613448069811514699875n;

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Basic byte/hex helpers
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) hex = '0' + hex;
  return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  const l = arrs.reduce((a, b) => a + b.length, 0);
  const r = new Uint8Array(l);
  let o = 0;
  for (const a of arrs) {
    r.set(a, o);
    o += a.length;
  }
  return r;
}

export function base58encode(bytes: Uint8Array): string {
  let z = 0;
  while (z < bytes.length && bytes[z] === 0) z++;
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = BASE58_ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  return '1'.repeat(z) + (out || '1');
}

export function doubleSha256(bytes: Uint8Array): Uint8Array {
  return sha256(sha256(bytes));
}

export function base58check(version: number, payload: Uint8Array): string {
  const body = concatBytes(new Uint8Array([version]), payload);
  const chk = doubleSha256(body).slice(0, 4);
  return base58encode(concatBytes(body, chk));
}

export function intToHex(privInt: bigint): string {
  return privInt.toString(16).padStart(64, '0');
}

// Derive Bitcoin address from private key using secp256k1
export function deriveAddressFromPrivKey(privHex: string): string {
  try {
    const privBytes = hexToBytes(privHex);
    // Get compressed public key
    const pubKey = secp256k1.getPublicKey(privBytes, true);
    // Hash160 = RIPEMD160(SHA256(pubKey))
    const hash160 = ripemd160(sha256(pubKey));
    // Base58Check encode with version byte 0x00
    return base58check(ADDRESS_PREFIX, hash160);
  } catch (error) {
    console.error('Error deriving address:', error);
    return '';
  }
}

export function intToWif(privInt: bigint): string {
  const privHex = intToHex(privInt);
  const privBytes = hexToBytes(privHex);
  // Compressed WIF has 0x01 suffix
  const payload = concatBytes(privBytes, new Uint8Array([0x01]));
  return base58check(WIF_COMPRESSED_PREFIX, payload);
}

// Hash a passphrase to create a brain wallet private key (SHA256)
export function brainWalletHash(passphrase: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hash = sha256(data);
  return bytesToHex(hash);
}

// Check balance via Blockstream API
export async function getAddressStats(addr: string): Promise<{
  received: number;
  sent: number;
  unspent: number;
  txcount: number;
}> {
  try {
    const r = await fetch(API_BASE + addr);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();

    const c = (j && j.chain_stats) ? j.chain_stats : { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 };
    const m = (j && j.mempool_stats) ? j.mempool_stats : { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 };

    const funded = Number(c.funded_txo_sum || 0) + Number(m.funded_txo_sum || 0);
    const spent = Number(c.spent_txo_sum || 0) + Number(m.spent_txo_sum || 0);
    const txc = Number(c.tx_count || 0) + Number(m.tx_count || 0);

    return { received: funded, sent: spent, unspent: funded - spent, txcount: txc };
  } catch (e) {
    console.warn('getAddressStats failed for', addr, e);
    return { received: 0, sent: 0, unspent: 0, txcount: 0 };
  }
}

export function satsToBTC(sats: number): string {
  return (sats / 1e8).toFixed(8);
}

// Quantum random number helper
export async function getQuantumRandom(min: bigint, max: bigint): Promise<bigint> {
  try {
    const response = await fetch('https://qrng.anu.edu.au/API/jsonI.php?length=4&type=uint16');
    const data = await response.json();
    const randomValue = (data.data[0] + data.data[1] * 65536 + data.data[2] * 65536 * 65536) / (65536 * 65536 * 65536);
    const range = max - min;
    return min + BigInt(Math.floor(Number(range) * randomValue));
  } catch (error) {
    console.warn('Quantum RNG failed, using crypto.random:', error);
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    const randomValue = (array[0] / 4294967295 + array[1] / 4294967295) / 2;
    const range = max - min;
    return min + BigInt(Math.floor(Number(range) * randomValue));
  }
}

// Generate key data for a page
export function generateKeyData(pageNum: bigint): Array<{
  privateKeyInt: bigint;
  hex: string;
  address: string;
  wif: string;
  balance: string;
}> {
  const keys = [];
  const startInt = (pageNum - 1n) * KEYS_PER_PAGE + 1n;

  for (let i = 0n; i < KEYS_PER_PAGE; i++) {
    const privInt = startInt + i;
    if (privInt >= N_CURVE) break;

    const hex = intToHex(privInt);
    const address = deriveAddressFromPrivKey(hex);
    const wif = intToWif(privInt);

    keys.push({
      privateKeyInt: privInt,
      hex,
      address,
      wif,
      balance: '0'
    });
  }
  return keys;
}

export function isValidBase58Address(addr: string): boolean {
  return addr.split('').every(c => BASE58_ALPHABET.includes(c)) && addr.length >= 26 && addr.length <= 35;
}