'use client';

import React, { useEffect, ReactNode } from 'react';
import { useNostrUser } from '@/lib/nostr/hooks';
import { connectToRelays, getSavedRelays } from '@/lib/nostr/relays';

type ClientWrapperRenderProps = {
  isLoggedIn: boolean;
  isLoading: boolean;
  publicKey: string | null;
};

interface ClientWrapperProps {
  children: (props: ClientWrapperRenderProps) => ReactNode;
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  const { isLoggedIn, isLoading, publicKey } = useNostrUser();

  // Connect to relays on login
  useEffect(() => {
    if (isLoggedIn) {
      const relays = getSavedRelays();
      connectToRelays(relays);
    }
  }, [isLoggedIn]);

  // Important: Make sure children is a function and call it with the props
  return <>{children({ isLoggedIn, isLoading, publicKey })}</>;
}