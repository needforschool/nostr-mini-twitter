"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNostrProfile } from '@/lib/nostr/hooks';
import { createAndPublishNote } from '@/lib/nostr/events';
import { getCurrentUserPublicKey } from '@/lib/nostr/keys';
import { ImageIcon, Smile, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteFormProps {
  onNotePublished?: () => void;
  replyTo?: string;
  className?: string;
}

export function NoteForm({ onNotePublished, replyTo, className }: NoteFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const currentUserPubkey = getCurrentUserPublicKey();
  const { profile } = useNostrProfile(currentUserPubkey);
  
  // Handle textarea input
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };
  
  // Auto-resize textarea
  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Create tags for reply if needed
      const tags = replyTo ? [['e', replyTo]] : [];
      
      // Publish the note
      const event = await createAndPublishNote(content, tags);
      
      if (event) {
        setContent('');
        if (onNotePublished) {
          onNotePublished();
        }
      }
    } catch (error) {
      console.error('Error publishing note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get user's display name and initial
  const displayName = profile?.name || currentUserPubkey?.slice(0, 8) + '...';
  const initial = displayName ? displayName.slice(0, 2).toUpperCase() : '??';
  
  return (
    <Card className={cn("border shadow-sm", className)}>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-4">
          <div className="flex space-x-3">
            <Avatar className="h-10 w-10">
              {profile?.picture ? (
                <AvatarImage src={profile.picture} alt={displayName} />
              ) : (
                <AvatarFallback>{initial}</AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder={replyTo ? "Write your reply..." : "What's happening?"}
                value={content}
                onChange={handleContentChange}
                onInput={autoResizeTextarea}
                className="min-h-[80px] resize-none border-none shadow-none focus-visible:ring-0 p-0"
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="border-t flex justify-between pt-3">
          <div className="flex space-x-2">
            <Button type="button" variant="ghost" size="icon" className="text-primary">
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="text-primary">
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={!content.trim() || isSubmitting}
            className="px-4"
          >
            {isSubmitting ? (
              <span>Publishing...</span>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                <span>{replyTo ? 'Reply' : 'Post'}</span>
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}