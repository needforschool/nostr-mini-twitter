import { SimplePool, type Relay } from 'nostr-tools';

// Relay management service for Nostr

const RELAYS_STORAGE_KEY = 'nostr_relays';

// Default relays to use if none are configured
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
];

// Create a pool for relay connections
let pool: SimplePool | null = null;

// Track active relay connections
let activeRelays: Record<string, Relay> = {};

/**
 * Initialize the relay pool
 * @returns The relay pool instance
 */
export function getPool(): SimplePool {
  if (!pool) {
    pool = new SimplePool();
  }
  return pool;
}

/**
 * Close all relay connections and destroy the pool
 */
export function closePool(): void {
  if (pool) {
    pool.close(getSavedRelays());
    pool = null;
    activeRelays = {};
  }
}

/**
 * Connect to a single relay
 * @param url The relay URL to connect to
 * @returns Promise that resolves when connected
 */
export async function connectToRelay(url: string): Promise<Relay> {
  try {
    if (activeRelays[url]) {
      return activeRelays[url];
    }
    
    const p = getPool();
    const relay = await p.ensureRelay(url);
    activeRelays[url] = relay;
    return relay;
  } catch (error) {
    console.error(`Error connecting to relay ${url}:`, error);
    throw new Error(`Failed to connect to relay: ${url}`);
  }
}

/**
 * Connect to multiple relays
 * @param urls Array of relay URLs to connect to
 * @returns Promise that resolves when all connections are attempted
 */
export async function connectToRelays(urls: string[] = getSavedRelays()): Promise<Relay[]> {
  try {
    const p = getPool();
    const connections = urls.map(url => p.ensureRelay(url)
      .then(relay => {
        activeRelays[url] = relay;
        return relay;
      })
      .catch(error => {
        console.error(`Error connecting to relay ${url}:`, error);
        return null;
      })
    );
    
    const relays = await Promise.all(connections);
    return relays.filter(Boolean) as Relay[];
  } catch (error) {
    console.error('Error connecting to relays:', error);
    throw new Error('Failed to connect to relays');
  }
}

/**
 * Disconnect from a specific relay
 * @param url The relay URL to disconnect from
 */
export function disconnectFromRelay(url: string): void {
  if (activeRelays[url] && pool) {
    pool.close([url]);
    delete activeRelays[url];
  }
}

/**
 * Save a list of relay URLs to local storage
 * @param relays Array of relay URLs
 */
export function saveRelays(relays: string[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RELAYS_STORAGE_KEY, JSON.stringify(relays));
    }
  } catch (error) {
    console.error('Error saving relays:', error);
  }
}

/**
 * Get the list of saved relay URLs from local storage
 * @returns Array of relay URLs
 */
export function getSavedRelays(): string[] {
  try {
    if (typeof window !== 'undefined') {
      const relays = localStorage.getItem(RELAYS_STORAGE_KEY);
      return relays ? JSON.parse(relays) : DEFAULT_RELAYS;
    }
    return DEFAULT_RELAYS;
  } catch (error) {
    console.error('Error getting saved relays:', error);
    return DEFAULT_RELAYS;
  }
}

/**
 * Add a new relay to the saved list
 * @param url The relay URL to add
 */
export function addRelay(url: string): void {
  const relays = getSavedRelays();
  if (!relays.includes(url)) {
    saveRelays([...relays, url]);
  }
}

/**
 * Remove a relay from the saved list
 * @param url The relay URL to remove
 */
export function removeRelay(url: string): void {
  const relays = getSavedRelays();
  saveRelays(relays.filter(relay => relay !== url));
  disconnectFromRelay(url);
}

/**
 * Check if the relay is active
 * @param url The relay URL to check
 * @returns True if connected, false otherwise
 */
export function isRelayActive(url: string): boolean {
  return Boolean(activeRelays[url]);
}

/**
 * Get all active relays
 * @returns Object with relay URLs as keys and Relay instances as values
 */
export function getActiveRelays(): Record<string, Relay> {
  return {...activeRelays};
}

/**
 * Get list of active relay URLs
 * @returns Array of active relay URLs
 */
export function getActiveRelayUrls(): string[] {
  return Object.keys(activeRelays);
}