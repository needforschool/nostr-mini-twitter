import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Keys management service for Nostr

const PRIVATE_KEY_STORAGE_KEY = 'nostr_private_key';

/**
 * Generate a new private key for Nostr
 * @returns The generated private key in hex format
 */
export function generateNewPrivateKey(): string {
  const privateKeyBytes = generateSecretKey();
  return bytesToHex(privateKeyBytes);
}

/**
 * Get the public key from a private key
 * @param privateKeyHex The private key in hex format
 * @returns The corresponding public key in hex format
 */
export function getNostrPublicKey(privateKeyHex: string): string {
  try {
    const privateKeyBytes = hexToBytes(privateKeyHex);
    return getPublicKey(privateKeyBytes);
  } catch (error) {
    console.error('Error getting public key:', error);
    throw new Error('Invalid private key format');
  }
}

/**
 * Convert hex public key to bech32 npub format
 * @param publicKey The public key in hex format
 * @returns The npub (bech32) formatted public key
 */
export function hexToNpub(publicKey: string): string {
  return nip19.npubEncode(publicKey);
}

/**
 * Convert hex private key to bech32 nsec format
 * @param privateKeyHex The private key in hex format
 * @returns The nsec (bech32) formatted private key
 */
export function hexToNsec(privateKeyHex: string): string {
  const privateKeyBytes = hexToBytes(privateKeyHex);
  return nip19.nsecEncode(privateKeyBytes);
}

/**
 * Convert npub (bech32) to hex public key
 * @param npub The npub (bech32) formatted public key
 * @returns The hex formatted public key
 */
export function npubToHex(npub: string): string {
  try {
    const { data } = nip19.decode(npub);
    return data as string;
  } catch (error) {
    console.error('Error decoding npub:', error);
    throw new Error('Invalid npub format');
  }
}

/**
 * Convert nsec (bech32) to hex private key
 * @param nsec The nsec (bech32) formatted private key
 * @returns The hex formatted private key
 */
export function nsecToHex(nsec: string): string {
  try {
    const { data } = nip19.decode(nsec);
    return bytesToHex(data as Uint8Array);
  } catch (error) {
    console.error('Error decoding nsec:', error);
    throw new Error('Invalid nsec format');
  }
}

/**
 * Save the private key to local storage
 * @param privateKeyHex The private key in hex format
 */
export function savePrivateKey(privateKeyHex: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKeyHex);
    }
  } catch (error) {
    console.error('Error saving private key:', error);
    throw new Error('Failed to save private key');
  }
}

/**
 * Get the private key from local storage
 * @returns The private key in hex format, or null if not found
 */
export function getPrivateKey(): string | null {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    }
    return null;
  } catch (error) {
    console.error('Error getting private key:', error);
    return null;
  }
}

/**
 * Remove the private key from local storage
 */
export function clearPrivateKey(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error clearing private key:', error);
  }
}

/**
 * Check if a private key exists in local storage
 * @returns True if a private key exists, false otherwise
 */
export function hasPrivateKey(): boolean {
  return getPrivateKey() !== null;
}

/**
 * Get the current user's public key
 * @returns The public key in hex format, or null if no private key is found
 */
export function getCurrentUserPublicKey(): string | null {
  const privateKeyHex = getPrivateKey();
  if (!privateKeyHex) return null;
  
  return getNostrPublicKey(privateKeyHex);
}