"use client";

import React, { useState } from 'react';
import { Event } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Share, MoreHorizontal, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNostrProfile } from '@/lib/nostr/hooks';
import { createReactionEvent, publishEvent } from '@/lib/nostr/events';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  event: Event;
  onReply?: (event: Event) => void;
  isReply?: boolean;
  className?: string;
}

export function NoteCard({ event, onReply, isReply = false, className }: NoteCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const { profile, isLoading: isProfileLoading } = useNostrProfile(event.pubkey);
  
  const timestamp = new Date(event.created_at * 1000);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
  
  // Extract mentions and URLs for rendering
  const content = event.content;
  
  // Handle like/reaction
  const handleLike = async () => {
    if (isLikeLoading) return;
    
    setIsLikeLoading(true);
    try {
      const reactionEvent = await createReactionEvent(event.id, event.pubkey);
      if (reactionEvent) {
        await publishEvent(reactionEvent);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error liking note:', error);
    } finally {
      setIsLikeLoading(false);
    }
  };
  
  // Handle reply
  const handleReply = () => {
    if (onReply) {
      onReply(event);
    }
  };
  
  // Get user's display name
  const displayName = profile?.name || event.pubkey.slice(0, 8) + '...';
  
  return (
    <Card className={cn("border shadow-sm mb-4", className)}>
      <CardContent className="pt-4">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            {profile?.picture ? (
              <AvatarImage src={profile.picture} alt={displayName} />
            ) : (
              <AvatarFallback className="bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{displayName}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  {timeAgo}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Utilisation de styles inline pour garantir le wrapping */}
            <div 
              className="text-sm" 
              style={{ 
                overflowWrap: 'break-word', 
                wordBreak: 'break-word',
                wordWrap: 'break-word',
                maxWidth: '100%',
                hyphens: 'auto'
              }}
            >
              {content}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between border-t">
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleReply}
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            <span className="text-xs">Reply</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground",
              isLiked && "text-red-500"
            )}
            onClick={handleLike}
            disabled={isLikeLoading}
          >
            <Heart className={cn("mr-1 h-4 w-4", isLiked && "fill-red-500")} />
            <span className="text-xs">Like</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <Share className="mr-1 h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}