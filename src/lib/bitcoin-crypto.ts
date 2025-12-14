// Bitcoin Crypto Utilities for Brain Wallet Analysis
import * as secp256k1 from '@noble/secp256k1';

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

// SHA256 using Web Crypto API
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}

// RIPEMD160 implementation
function ripemd160(message: Uint8Array): Uint8Array {
  const K = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e];
  const Kp = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];
  
  function f(j: number, x: number, y: number, z: number): number {
    if (j <= 15) return x ^ y ^ z;
    if (j <= 31) return (x & y) | (~x & z);
    if (j <= 47) return (x | ~y) ^ z;
    if (j <= 63) return (x & z) | (y & ~z);
    return x ^ (y | ~z);
  }
  
  function rotl(x: number, n: number): number {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }
  
  const r = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
             7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
             3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
             1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
             4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
  
  const rp = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
              6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
              15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
              8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
              12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
  
  const s = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
             7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
             11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
             11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
             9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
  
  const sp = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
              9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
              9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
              15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
              8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];

  const msgLen = message.length;
  const bitLen = msgLen * 8;
  const padLen = (msgLen % 64 < 56) ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(message);
  padded[msgLen] = 0x80;
  
  for (let i = 0; i < 8; i++) {
    padded[msgLen + padLen + i] = (bitLen >>> (i * 8)) & 0xff;
  }
  
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  
  for (let i = 0; i < padded.length; i += 64) {
    const X = new Array(16);
    for (let j = 0; j < 16; j++) {
      X[j] = padded[i + j * 4] | (padded[i + j * 4 + 1] << 8) | 
             (padded[i + j * 4 + 2] << 16) | (padded[i + j * 4 + 3] << 24);
    }
    
    let A = h0, B = h1, C = h2, D = h3, E = h4;
    let Ap = h0, Bp = h1, Cp = h2, Dp = h3, Ep = h4;
    
    for (let j = 0; j < 80; j++) {
      const jj = Math.floor(j / 16);
      let T = (A + f(j, B, C, D) + X[r[j]] + K[jj]) >>> 0;
      T = (rotl(T, s[j]) + E) >>> 0;
      A = E; E = D; D = rotl(C, 10); C = B; B = T;
      
      T = (Ap + f(79 - j, Bp, Cp, Dp) + X[rp[j]] + Kp[jj]) >>> 0;
      T = (rotl(T, sp[j]) + Ep) >>> 0;
      Ap = Ep; Ep = Dp; Dp = rotl(Cp, 10); Cp = Bp; Bp = T;
    }
    
    const T = (h1 + C + Dp) >>> 0;
    h1 = (h2 + D + Ep) >>> 0;
    h2 = (h3 + E + Ap) >>> 0;
    h3 = (h4 + A + Bp) >>> 0;
    h4 = (h0 + B + Cp) >>> 0;
    h0 = T;
  }
  
  const result = new Uint8Array(20);
  for (let i = 0; i < 4; i++) {
    result[i] = (h0 >>> (i * 8)) & 0xff;
    result[i + 4] = (h1 >>> (i * 8)) & 0xff;
    result[i + 8] = (h2 >>> (i * 8)) & 0xff;
    result[i + 12] = (h3 >>> (i * 8)) & 0xff;
    result[i + 16] = (h4 >>> (i * 8)) & 0xff;
  }
  
  return result;
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

export async function doubleSha256(bytes: Uint8Array): Promise<Uint8Array> {
  const h1 = await sha256(bytes);
  return await sha256(h1);
}

export async function base58check(version: number, payload: Uint8Array): Promise<string> {
  const body = concatBytes(new Uint8Array([version]), payload);
  const chk = (await doubleSha256(body)).slice(0, 4);
  return base58encode(concatBytes(body, chk));
}

export function intToHex(privInt: bigint): string {
  return privInt.toString(16).padStart(64, '0');
}

// Derive Bitcoin address from private key using secp256k1
export async function deriveAddressFromPrivKey(privHex: string): Promise<string> {
  try {
    const privBytes = hexToBytes(privHex);
    // Get compressed public key
    const pubKey = secp256k1.getPublicKey(privBytes, true);
    // Hash160 = RIPEMD160(SHA256(pubKey))
    const sha256Hash = await sha256(pubKey);
    const hash160 = ripemd160(sha256Hash);
    // Base58Check encode with version byte 0x00
    return await base58check(ADDRESS_PREFIX, hash160);
  } catch (error) {
    console.error('Error deriving address:', error);
    return '';
  }
}

export async function intToWif(privInt: bigint): Promise<string> {
  const privHex = intToHex(privInt);
  const privBytes = hexToBytes(privHex);
  // Compressed WIF has 0x01 suffix
  const payload = concatBytes(privBytes, new Uint8Array([0x01]));
  return await base58check(WIF_COMPRESSED_PREFIX, payload);
}

// Hash a passphrase to create a brain wallet private key (SHA256)
export async function brainWalletHash(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hash = await sha256(data);
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
export async function generateKeyData(pageNum: bigint): Promise<Array<{
  privateKeyInt: bigint;
  hex: string;
  address: string;
  wif: string;
  balance: string;
}>> {
  const keys = [];
  const startInt = (pageNum - 1n) * KEYS_PER_PAGE + 1n;

  for (let i = 0n; i < KEYS_PER_PAGE; i++) {
    const privInt = startInt + i;
    if (privInt >= N_CURVE) break;

    const hex = intToHex(privInt);
    const address = await deriveAddressFromPrivKey(hex);
    const wif = await intToWif(privInt);

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