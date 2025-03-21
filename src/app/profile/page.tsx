'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientWrapper } from '@/components/ClientWrapper';
import { getCurrentUserPublicKey } from '@/lib/nostr/keys';

export default function ProfilePage() {
  const router = useRouter();

  return (
    <ClientWrapper>
      {({ isLoggedIn, isLoading, publicKey }) => {
        // Si l'utilisateur n'est pas connecté, rediriger vers la page d'accueil
        useEffect(() => {
          if (!isLoading && !isLoggedIn) {
            router.push('/');
          } else if (!isLoading && isLoggedIn && publicKey) {
            // Rediriger vers le profil de l'utilisateur connecté
            router.push(`/profile/${publicKey}`);
          }
        }, [isLoading, isLoggedIn, publicKey, router]);

        // Afficher un message de chargement pendant la redirection
        return (
          <div className="flex items-center justify-center min-h-screen">
            <p>Chargement du profil...</p>
          </div>
        );
      }}
    </ClientWrapper>
  );
}