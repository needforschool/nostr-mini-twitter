'use client';

import { Timeline } from '@/components/nostr/Timeline';
import { Login } from '@/components/nostr/Login';
import { Header } from '@/components/layout/Header';
import { ClientWrapper } from '@/components/ClientWrapper';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <ClientWrapper>
        {({ isLoggedIn }) => (
          <>
            <Header />
            <div className="container p-4 mx-auto max-w-6xl">
              {isLoggedIn ? (
                <Timeline />
              ) : (
                <div className="py-12">
                  <h1 className="text-3xl font-bold text-center mb-8">Welcome to NostrMini</h1>
                  <p className="text-center text-muted-foreground mb-12">
                    A minimal Nostr client built with Next.js and TypeScript
                  </p>
                  <Login />
                </div>
              )}
            </div>
          </>
        )}
      </ClientWrapper>
    </main>
  );
}