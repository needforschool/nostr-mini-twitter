import { useEffect, useState, useCallback, useRef } from 'react';
import { Event, Filter } from 'nostr-tools';
import { TEXT_NOTE_KIND, METADATA_KIND } from './constants';
import { fetchEvents, subscribeToEvents, fetchUserMetadata, parseUserMetadata } from './events';
import { getSavedRelays, connectToRelays } from './relays';
import { getCurrentUserPublicKey, hasPrivateKey } from './keys';

/**
 * Hook for managing user authentication state
 * @returns Current user state and login/logout methods
 */
export function useNostrUser() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = () => {
      const hasKey = hasPrivateKey();
      const pubKey = getCurrentUserPublicKey();
      
      setIsLoggedIn(hasKey);
      setPublicKey(pubKey);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage events in case the user logs in/out in another tab
    const handleStorageChange = () => {
      checkAuth();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, []);

  return {
    isLoggedIn,
    publicKey,
    isLoading,
  };
}

/**
 * Hook for fetching and subscribing to events
 * @param filter The filter to apply for fetching/subscribing
 * @param options Additional options
 * @returns Fetched events and loading state
 */
export function useNostrEvents(
  filter: Filter,
  options: {
    enabled?: boolean;
    relayUrls?: string[];
    subscribe?: boolean;
    initialFetch?: boolean;
    autoUpdate?: boolean; // Nouvel option pour contrôler l'auto-refresh
  } = {}
) {
  const {
    enabled = true,
    relayUrls = getSavedRelays(),
    subscribe = true,
    initialFetch = true,
    autoUpdate = false, // Désactivé par défaut
  } = options;

  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]); // Pour stocker les nouveaux events sans les afficher
  const [isLoading, setIsLoading] = useState<boolean>(initialFetch && enabled);
  const [hasNewEvents, setHasNewEvents] = useState<boolean>(false); // Indicateur pour l'UI
  const unsubRef = useRef<(() => void) | null>(null);

  // Function to fetch events
  const fetchEventsData = useCallback(async () => {
    if (!enabled) return;
    
    setIsLoading(true);
    try {
      const fetchedEvents = await fetchEvents(filter, relayUrls);
      
      // Sort by created_at in descending order (newest first)
      fetchedEvents.sort((a: Event, b: Event) => b.created_at - a.created_at);
      
      setEvents(fetchedEvents);
      // Clear pending events and reset hasNewEvents indicator
      setPendingEvents([]);
      setHasNewEvents(false);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, relayUrls, enabled]);

  // Apply pending events to the main events list
  const applyPendingEvents = useCallback(() => {
    if (pendingEvents.length > 0) {
      setEvents(prev => {
        // Merge events, avoid duplicates, and sort
        const allEvents = [...prev, ...pendingEvents];
        const uniqueEvents = allEvents.filter((event, index, self) => 
          index === self.findIndex(e => e.id === event.id)
        );
        uniqueEvents.sort((a, b) => b.created_at - a.created_at);
        return uniqueEvents;
      });
      
      // Clear pending events and reset indicator
      setPendingEvents([]);
      setHasNewEvents(false);
    }
  }, [pendingEvents]);

  // Setup subscription and initial fetch
  useEffect(() => {
    if (!enabled) return;
    
    // Connect to relays first
    const connectAndFetch = async () => {
      try {
        await connectToRelays(relayUrls);
        
        // Initial fetch if requested
        if (initialFetch) {
          await fetchEventsData();
        }
        
        // Setup subscription if requested
        if (subscribe) {
          // Cleanup previous subscription if exists
          if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
          }
          
          // Subscribe to new events
          unsubRef.current = subscribeToEvents(
            filter,
            (event: Event, _relay: string) => {
              // Check if event already exists in events or pendingEvents to avoid duplicates
              const isDuplicate = 
                events.some(e => e.id === event.id) || 
                pendingEvents.some(e => e.id === event.id);
              
              if (!isDuplicate) {
                if (autoUpdate) {
                  // If auto-update is enabled, add directly to main events
                  setEvents(prev => {
                    const updated = [event, ...prev];
                    updated.sort((a, b) => b.created_at - a.created_at);
                    return updated;
                  });
                } else {
                  // Otherwise, add to pending events
                  setPendingEvents(prev => {
                    const updated = [event, ...prev];
                    updated.sort((a, b) => b.created_at - a.created_at);
                    return updated;
                  });
                  setHasNewEvents(true);
                }
              }
            },
            relayUrls
          );
        }
      } catch (error) {
        console.error('Error in useNostrEvents:', error);
      }
    };
    
    connectAndFetch();
    
    // Cleanup subscription on unmount or when filter/relayUrls change
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [filter, relayUrls, subscribe, initialFetch, enabled, fetchEventsData, autoUpdate, events, pendingEvents]);

  return {
    events,
    pendingEvents,
    hasNewEvents,
    isLoading,
    refetch: fetchEventsData,
    loadNewEvents: applyPendingEvents, // Nouvelle méthode pour chargement manuel
  };
}

/**
 * Hook for fetching user profile data
 * @param pubkey The public key of the user
 * @param options Additional options
 * @returns User profile data and loading state
 */
export function useNostrProfile(
  pubkey: string | null,
  options: {
    enabled?: boolean;
    relayUrls?: string[];
  } = {}
) {
  const {
    enabled = true,
    relayUrls = getSavedRelays(),
  } = options;

  type ProfileData = {
    name?: string;
    about?: string;
    picture?: string;
    website?: string;
    nip05?: string;
    [key: string]: string | undefined;
  };

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !!pubkey);

  // Fetch user profile data
  const fetchProfile = useCallback(async () => {
    if (!pubkey || !enabled) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const metadataEvent = await fetchUserMetadata(pubkey, relayUrls);
      setEvent(metadataEvent);
      
      if (metadataEvent) {
        const parsedMetadata = parseUserMetadata(metadataEvent);
        setProfile(parsedMetadata);
      } else {
        // If no metadata found, set a basic profile with just the public key
        setProfile({
          name: pubkey.slice(0, 8) + '...'
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [pubkey, relayUrls, enabled]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    event,
    isLoading,
    refetch: fetchProfile,
  };
}

/**
 * Hook for fetching recent notes for the timeline
 * @param options Additional options
 * @returns Timeline notes and loading state
 */
export function useNostrTimeline(
  options: {
    limit?: number;
    since?: number;
    relayUrls?: string[];
    enabled?: boolean;
    autoUpdate?: boolean; // Ajout du paramètre autoUpdate
  } = {}
) {
  const {
    limit = 20,
    since = Math.floor(Date.now() / 1000) - 24 * 60 * 60, // Last 24 hours
    relayUrls = getSavedRelays(),
    enabled = true,
    autoUpdate = false, // Désactivé par défaut
  } = options;

  const filter: Filter = {
    kinds: [TEXT_NOTE_KIND],
    since,
    limit,
  };

  return useNostrEvents(filter, {
    relayUrls,
    enabled,
    subscribe: true,
    initialFetch: true,
    autoUpdate,
  });
}

/**
 * Hook for fetching a user's notes
 * @param pubkey The public key of the user
 * @param options Additional options
 * @returns User's notes and loading state
 */
export function useNostrUserNotes(
  pubkey: string | null,
  options: {
    limit?: number;
    relayUrls?: string[];
    enabled?: boolean;
  } = {}
) {
  const {
    limit = 20,
    relayUrls = getSavedRelays(),
    enabled = true && !!pubkey,
  } = options;

  const filter: Filter = pubkey ? {
    kinds: [TEXT_NOTE_KIND],
    authors: [pubkey],
    limit,
  } : { kinds: [TEXT_NOTE_KIND], limit: 0 };

  return useNostrEvents(filter, {
    relayUrls,
    enabled,
  });
}