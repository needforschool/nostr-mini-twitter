// Nostr kind constants
// Based on NIP-01 and others

// Standard event kinds
export const TEXT_NOTE_KIND = 1;
export const METADATA_KIND = 0;
export const REACTION_KIND = 7;
export const CONTACTS_KIND = 3;
export const ENCRYPTED_DM_KIND = 4;
export const EVENT_DELETION_KIND = 5;
export const REPOST_KIND = 6;

// Replaceable events
export const CHANNEL_METADATA_KIND = 41;
export const CHANNEL_MESSAGE_KIND = 42;

// Parameterized replaceable events
export const LONG_FORM_CONTENT_KIND = 30023;
export const USER_STATUS_KIND = 30315;