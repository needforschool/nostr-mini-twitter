import { Event, EventTemplate, Filter, finalizeEvent } from 'nostr-tools';
import { TEXT_NOTE_KIND, METADATA_KIND, REACTION_KIND } from './constants';
import { getPool, getSavedRelays } from './relays';
import { getPrivateKey } from './keys';
import { hexToBytes } from '@noble/hashes/utils';

/**
 * Create and sign a new note event
 * @param content The text content of the note
 * @param tags Optional tags to include in the event
 * @returns The signed event object
 */
export async function createNoteEvent(content: string, tags: string[][] = []): Promise<Event | null> {
  const privateKeyHex = getPrivateKey();
  if (!privateKeyHex) {
    throw new Error('No private key available');
  }

  try {
    // Convert hex private key to bytes
    const privateKeyBytes = hexToBytes(privateKeyHex);
    
    // Create event template
    const eventTemplate: EventTemplate = {
      kind: TEXT_NOTE_KIND, // 1 = text note
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    };

    // Sign the event with the private key
    const signedEvent = finalizeEvent(eventTemplate, privateKeyBytes);
    return signedEvent;
  } catch (error) {
    console.error('Error creating note event:', error);
    return null;
  }
}

/**
 * Publish an event to the connected relays
 * @param event The event to publish
 * @param relayUrls Optional array of relay URLs to publish to (uses saved relays by default)
 * @returns Promise that resolves with the relay publication status
 */
export async function publishEvent(
  event: Event, 
  relayUrls: string[] = getSavedRelays()
): Promise<Record<string, boolean>> {
  try {
    const pool = getPool();
    const publishPromises = pool.publish(relayUrls, event);
    
    // Create an object to track the success/failure for each relay
    const results: Record<string, boolean> = {};
    
    // Initialize all relays as pending/false
    relayUrls.forEach(relayUrl => {
      results[relayUrl] = false;
    });
    
    // Wait for all publish promises to settle
    try {
      const settledResults = await Promise.allSettled(publishPromises);
      
      // Update results based on settled promises
      settledResults.forEach((result, index) => {
        const relayUrl = relayUrls[index];
        if (result.status === 'fulfilled') {
          results[relayUrl] = true;
        }
      });
    } catch (error) {
      console.error('Error waiting for publish results:', error);
    }
    
    return results;
  } catch (error) {
    console.error('Error publishing event:', error);
    throw new Error('Failed to publish event');
  }
}

/**
 * Create and publish a new note
 * @param content The text content of the note
 * @param tags Optional tags to include
 * @param relayUrls Optional array of relay URLs to publish to
 * @returns The published event if successful
 */
export async function createAndPublishNote(
  content: string, 
  tags: string[][] = [],
  relayUrls?: string[]
): Promise<Event | null> {
  try {
    const event = await createNoteEvent(content, tags);
    if (!event) return null;
    
    await publishEvent(event, relayUrls);
    return event;
  } catch (error) {
    console.error('Error creating and publishing note:', error);
    return null;
  }
}

/**
 * Create a reaction (like) event
 * @param eventId The ID of the event to react to
 * @param pubkey The pubkey of the event author
 * @param content The reaction content (typically "+" for like)
 * @returns The signed reaction event
 */
export async function createReactionEvent(
  eventId: string,
  pubkey: string,
  content: string = "+"
): Promise<Event | null> {
  const privateKeyHex = getPrivateKey();
  if (!privateKeyHex) {
    throw new Error('No private key available');
  }

  try {
    // Convert hex private key to bytes
    const privateKeyBytes = hexToBytes(privateKeyHex);
    
    // Create event template with 'e' and 'p' tags
    const eventTemplate: EventTemplate = {
      kind: REACTION_KIND, // 7 = reaction
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', eventId], // The event being reacted to
        ['p', pubkey],  // The pubkey of the note author
      ],
      content,
    };

    // Sign the event with the private key
    const signedEvent = finalizeEvent(eventTemplate, privateKeyBytes);
    return signedEvent;
  } catch (error) {
    console.error('Error creating reaction event:', error);
    return null;
  }
}

/**
 * Subscribe to events matching a filter
 * @param filter The filter to apply
 * @param onEvent Callback for each event received
 * @param relayUrls Optional array of relay URLs to subscribe to
 * @returns A function to close the subscription
 */
export function subscribeToEvents(
  filter: Filter,
  onEvent: (event: Event, relay: string) => void,
  relayUrls: string[] = getSavedRelays()
): () => void {
  const pool = getPool();
  
  // Use subscribeMany instead of sub
  const subscription = pool.subscribeMany(relayUrls, [filter], {
    onevent: (event: Event) => {
      // In this version of the API, we don't get the relay directly in the callback
      // So we might need to track it differently if needed
      onEvent(event, "unknown-relay");
    }
  });
  
  // Return a function to close the subscription
  return () => {
    subscription.close();
  };
}

/**
 * Fetch events matching a filter
 * @param filter The filter to apply
 * @param relayUrls Optional array of relay URLs to query
 * @returns Promise that resolves with an array of matching events
 */
export async function fetchEvents(
  filter: Filter,
  relayUrls: string[] = getSavedRelays(),
  options = { timeout: 3000 }
): Promise<Event[]> {
  try {
    const pool = getPool();
    // Use querySync instead of list based on the SimplePool API
    const events = await pool.querySync(relayUrls, filter, { maxWait: options.timeout });
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Fetch recent notes
 * @param limit Maximum number of notes to fetch
 * @param since Unix timestamp to fetch events from
 * @param relayUrls Optional array of relay URLs to query
 * @returns Promise that resolves with an array of note events
 */
export async function fetchRecentNotes(
  limit: number = 20,
  since: number = Math.floor(Date.now() / 1000) - 24 * 60 * 60, // Last 24 hours
  relayUrls?: string[]
): Promise<Event[]> {
  const filter: Filter = {
    kinds: [TEXT_NOTE_KIND],
    since,
    limit,
  };
  
  return fetchEvents(filter, relayUrls);
}

/**
 * Fetch notes from a specific user
 * @param pubkey The public key of the user
 * @param limit Maximum number of notes to fetch
 * @param relayUrls Optional array of relay URLs to query
 * @returns Promise that resolves with an array of note events
 */
export async function fetchUserNotes(
  pubkey: string,
  limit: number = 20,
  relayUrls?: string[]
): Promise<Event[]> {
  const filter: Filter = {
    kinds: [TEXT_NOTE_KIND],
    authors: [pubkey],
    limit,
  };
  
  return fetchEvents(filter, relayUrls);
}

/**
 * Fetch a single event by its ID
 * @param id The event ID to fetch
 * @param relayUrls Optional array of relay URLs to query
 * @returns Promise that resolves with the event, or null if not found
 */
export async function fetchEventById(
  id: string,
  relayUrls?: string[]
): Promise<Event | null> {
  const filter: Filter = {
    ids: [id],
  };
  
  const events = await fetchEvents(filter, relayUrls);
  return events.length > 0 ? events[0] : null;
}

/**
 * Fetch a user's metadata
 * @param pubkey The public key of the user
 * @param relayUrls Optional array of relay URLs to query
 * @returns Promise that resolves with the metadata event, or null if not found
 */
export async function fetchUserMetadata(
  pubkey: string,
  relayUrls?: string[]
): Promise<Event | null> {
  const filter: Filter = {
    kinds: [METADATA_KIND], // 0 = metadata
    authors: [pubkey],
    limit: 1,
  };
  
  const events = await fetchEvents(filter, relayUrls);
  
  // Sort by created_at to get the most recent metadata
  events.sort((a, b) => b.created_at - a.created_at);
  
  return events.length > 0 ? events[0] : null;
}

/**
 * Parse user metadata content
 * @param event The metadata event
 * @returns Parsed metadata object
 */
export function parseUserMetadata(event: Event): {
  name?: string;
  about?: string;
  picture?: string;
  website?: string;
  nip05?: string;
  [key: string]: string | undefined;
} {
  try {
    return JSON.parse(event.content);
  } catch (error) {
    console.error('Error parsing user metadata:', error);
    return {};
  }
}

/**
 * Update user metadata
 * @param metadata User metadata object
 * @returns Promise that resolves with the published event
 */
export async function updateUserMetadata(
  metadata: {
    name?: string;
    about?: string;
    picture?: string;
    website?: string;
    nip05?: string;
    [key: string]: string | undefined;
  },
  relayUrls?: string[]
): Promise<Event | null> {
  const privateKeyHex = getPrivateKey();
  if (!privateKeyHex) {
    throw new Error('No private key available');
  }

  try {
    // Convert hex private key to bytes
    const privateKeyBytes = hexToBytes(privateKeyHex);
    
    // Create event template
    const eventTemplate: EventTemplate = {
      kind: METADATA_KIND, // 0 = metadata
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(metadata),
    };

    // Sign the event with the private key
    const signedEvent = finalizeEvent(eventTemplate, privateKeyBytes);
    
    // Publish the event
    await publishEvent(signedEvent, relayUrls);
    
    return signedEvent;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return null;
  }
}