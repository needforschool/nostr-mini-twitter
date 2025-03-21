"use client";

import React, { useState } from 'react';
import { Event } from 'nostr-tools';
import { NoteCard } from './NoteCard';
import { NoteForm } from './NoteForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchEvents } from '@/lib/nostr/events';
import { getSavedRelays, connectToRelays } from '@/lib/nostr/relays';
import { TEXT_NOTE_KIND } from '@/lib/nostr/constants';
import { useEffect } from 'react';

interface TimelineProps {
  className?: string;
}

export function Timeline({ className }: TimelineProps) {
  const [replyToEvent, setReplyToEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch events on initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // S'assurer que les relais sont connectés
        await connectToRelays(getSavedRelays());
        
        // Création du filtre
        const filter = {
          kinds: [TEXT_NOTE_KIND],
          since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // Last 7 days
          limit: 50,
        };
        
        // Récupérer les événements
        const fetchedEvents = await fetchEvents(filter);
        
        // Trier les événements (les plus récents d'abord)
        fetchedEvents.sort((a: Event, b: Event) => b.created_at - a.created_at);
        
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error loading timeline data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Fonction pour rafraîchir manuellement
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Création du filtre
      const filter = {
        kinds: [TEXT_NOTE_KIND],
        since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // Last 7 days
        limit: 50,
      };
      
      // Récupérer les événements
      const fetchedEvents = await fetchEvents(filter);
      
      // Trier les événements (les plus récents d'abord)
      fetchedEvents.sort((a: Event, b: Event) => b.created_at - a.created_at);
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error refreshing timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle reply to note
  const handleReply = (event: Event) => {
    setReplyToEvent(event);
    // Scroll to the form
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  
  // Handle note published (either new note or reply)
  const handleNotePublished = () => {
    handleRefresh();
    setReplyToEvent(null);
  };
  
  // Render loading skeleton
  const renderSkeleton = () => {
    return Array(3).fill(0).map((_, i) => (
      <div key={i} className="border rounded-lg p-4 mb-4 space-y-3">
        <div className="flex items-start space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="flex justify-between pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    ));
  };
  
  return (
    <div className={cn("max-w-xl mx-auto", className)}>
      <div className="space-y-4 mb-6">
        {replyToEvent && (
          <div className="bg-muted p-2 rounded-lg">
            <p className="text-sm font-medium">
              Replying to @{replyToEvent.pubkey.slice(0, 8)}...
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {replyToEvent.content}
            </p>
          </div>
        )}
        
        <NoteForm 
          onNotePublished={handleNotePublished} 
          replyTo={replyToEvent?.id}
        />
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Timeline</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          renderSkeleton()
        ) : events.length > 0 ? (
          events.map((event) => (
            <NoteCard 
              key={event.id} 
              event={event} 
              onReply={handleReply}
            />
          ))
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">No notes found. Start posting or follow users to see their notes.</p>
          </div>
        )}
      </div>
    </div>
  );
}