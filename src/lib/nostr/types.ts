import { Event } from 'nostr-tools';

export interface NostrProfile {
  name?: string;
  about?: string;
  picture?: string;
  website?: string;
  nip05?: string;
  lud16?: string; // Lightning address
  [key: string]: any;
}

export interface NostrNote extends Event {
  // Add any additional fields or metadata we might want to track
  repliedTo?: string;
}