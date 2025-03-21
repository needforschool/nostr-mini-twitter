'use client';

import { Header } from '@/components/layout/Header';
import { ClientWrapper } from '@/components/ClientWrapper';
import { ProfileCard } from '@/components/nostr/ProfileCard';
import { NoteCard } from '@/components/nostr/NoteCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { getCurrentUserPublicKey, npubToHex } from '@/lib/nostr/keys';
import { cn } from '@/lib/utils';
import { Event } from 'nostr-tools';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const pubkeyParam = params?.pubkey as string;

  return (
    <main className="min-h-screen bg-background">
      <ClientWrapper>
        {({ isLoggedIn, isLoading }) => (
          <>
            <Header />
            
            {isLoading ? (
              <div className="container p-4 mx-auto max-w-6xl flex justify-center items-center min-h-[50vh]">
                <p>Loading...</p>
              </div>
            ) : (
              <div className="container p-4 mx-auto max-w-6xl">
                <div className="max-w-2xl mx-auto">
                  {pubkeyParam && <UserProfileView pubkey={pubkeyParam} isLoggedIn={isLoggedIn} />}
                </div>
              </div>
            )}
          </>
        )}
      </ClientWrapper>
    </main>
  );
}

function UserProfileView({ pubkey, isLoggedIn }: { pubkey: string; isLoggedIn: boolean }) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [hexPubkey, setHexPubkey] = useState<string>('');

  // Déterminer si c'est le profil de l'utilisateur connecté
  useEffect(() => {
    // Convertir le npub en hex si nécessaire
    let hexKey = pubkey;
    if (pubkey.startsWith('npub')) {
      try {
        hexKey = npubToHex(pubkey);
        setHexPubkey(hexKey);
      } catch (error) {
        console.error('Invalid npub format:', error);
        router.push('/404');
        return;
      }
    } else {
      setHexPubkey(pubkey);
    }

    const currentUserPubkey = getCurrentUserPublicKey();
    setIsCurrentUser(hexKey === currentUserPubkey);
  }, [pubkey, router]);

  // Fonction pour charger les notes manuellement
  const fetchUserNotes = async () => {
    if (!hexPubkey) return;
    
    setIsLoading(true);
    try {
      // Importation dynamique des fonctions nécessaires
      const { fetchUserNotes } = await import('@/lib/nostr/events');
      const notes = await fetchUserNotes(hexPubkey, 50);
      setEvents(notes);
    } catch (error) {
      console.error('Error fetching user notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les notes au chargement initial
  useEffect(() => {
    if (hexPubkey) {
      fetchUserNotes();
    }
  }, [hexPubkey]);

  // Handle refresh
  const handleRefresh = () => {
    fetchUserNotes();
  };

  // Render loading skeleton for notes
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
    <div className="space-y-6">
      <div className="relative">
        {hexPubkey && <ProfileCard pubkey={hexPubkey} />}
        
        {isLoggedIn && (
          <div className="absolute top-4 right-4">
            {isCurrentUser ? (
              <Button onClick={() => router.push('/settings?tab=profile')}>
                Modifier le profil
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  // Note: ceci est un placeholder pour l'implémentation future
                  // La logique de follow/unfollow serait liée à NIP-02 (Contacts List)
                  alert("Fonctionnalité de suivi à implémenter");
                }}
              >
                Suivre
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isCurrentUser ? 'Vos Notes' : 'Notes de cet utilisateur'}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
        
        {isLoading ? (
          renderSkeleton()
        ) : events.length > 0 ? (
          events.map((event) => (
            <NoteCard 
              key={event.id} 
              event={event} 
            />
          ))
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">
              {isCurrentUser 
                ? "Vous n'avez pas encore publié de notes." 
                : "Cet utilisateur n'a pas encore publié de notes."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}