import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNostrProfile, useNostrUserNotes } from '@/lib/nostr/hooks';
import { hexToNpub } from '@/lib/nostr/keys';
import { Globe, MessageSquare, Users, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCardProps {
  pubkey: string;
  className?: string;
}

export function ProfileCard({ pubkey, className }: ProfileCardProps) {
  const { profile, isLoading } = useNostrProfile(pubkey);
  const { events: userNotes } = useNostrUserNotes(pubkey, { limit: 1 });
  
  const npub = hexToNpub(pubkey);
  const displayName = profile?.name || pubkey.slice(0, 8) + '...';
  const initialLetters = displayName.slice(0, 2).toUpperCase();
  
  // If loading, show skeleton
  if (isLoading) {
    return (
      <Card className={cn("border shadow-sm", className)}>
        <CardHeader className="pb-0">
          <div className="flex space-x-4 items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Skeleton className="h-4 w-full mb-4" />
          <div className="flex justify-between">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className="pb-2 relative">
        {profile?.banner && (
          <div 
            className="absolute top-0 left-0 right-0 h-24 rounded-t-lg bg-cover bg-center" 
            style={{ backgroundImage: `url(${profile.banner})` }}
          />
        )}
        
        <div className={cn("flex items-start space-x-4", profile?.banner && "mt-16")}>
          <Avatar className="h-16 w-16 border-4 border-background">
            {profile?.picture ? (
              <AvatarImage src={profile.picture} alt={displayName} />
            ) : (
              <AvatarFallback>{initialLetters}</AvatarFallback>
            )}
          </Avatar>
          
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">{displayName}</h2>
            <p className="text-sm text-muted-foreground break-all">
              {npub.slice(0, 8)}...{npub.slice(-8)}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {profile?.about && (
          <p className="text-sm">{profile.about}</p>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {profile?.website && (
            <a 
              href={profile.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <Globe className="h-4 w-4" />
              <span>{new URL(profile.website).hostname}</span>
            </a>
          )}
          
          {profile?.nip05 && (
            <span className="flex items-center gap-1">
              <Link className="h-4 w-4" />
              <span>{profile.nip05}</span>
            </span>
          )}
          
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{userNotes.length || 0} notes</span>
          </span>
        </div>
        
        <div className="pt-2 flex space-x-2">
          <Button className="flex-1">Follow</Button>
          <Button variant="outline" className="flex-1">Share</Button>
        </div>
      </CardContent>
    </Card>
  );
}