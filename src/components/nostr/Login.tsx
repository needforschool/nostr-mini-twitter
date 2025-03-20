'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Plus, Copy, EyeOff, Eye } from 'lucide-react';
import { generateNewPrivateKey, savePrivateKey, hexToNpub, nsecToHex, getNostrPublicKey, hexToNsec } from '@/lib/nostr/keys';
import { cn } from '@/lib/utils';

interface LoginProps {
  onLoginSuccess?: () => void;
  className?: string;
}

export function Login({ onLoginSuccess, className }: LoginProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState<string | null>(null);
  const [generatedNsec, setGeneratedNsec] = useState<string | null>(null);
  const [generatedNpub, setGeneratedNpub] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  // Handle login with existing key
  const handleExistingKeyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate and cleanup the input
      let keyToSave = privateKey.trim();
      
      // Convert nsec to hex if needed
      if (keyToSave.startsWith('nsec')) {
        try {
          keyToSave = nsecToHex(keyToSave);
        } catch (error) {
          setError('Invalid nsec format. Please check your private key.');
          return;
        }
      }
      
      // Validate key format (basic check, should be 64 hex chars)
      if (!/^[a-f0-9]{64}$/i.test(keyToSave)) {
        setError('Invalid private key format. It should be 64 hex characters or an nsec string.');
        return;
      }
      
      // Try to derive public key to validate the private key
      try {
        const pubkey = getNostrPublicKey(keyToSave);
        const npub = hexToNpub(pubkey);
        
        // Save the private key
        savePrivateKey(keyToSave);
        
        // Show success message with the public key
        setSuccess(`Successfully logged in as ${npub.slice(0, 8)}...${npub.slice(-4)}`);
        setError(null);
        
        // Call onLoginSuccess callback if provided
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } catch (error) {
        setError('Invalid private key. Could not derive public key.');
        return;
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    }
  };
  
  // Generate a new private key
  const handleGenerateKey = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Generate new key
      const newPrivateKey = generateNewPrivateKey();
      
      // Derive public key
      const pubkey = getNostrPublicKey(newPrivateKey);
      const npub = hexToNpub(pubkey);
      const nsec = hexToNsec(newPrivateKey);
      
      // Store the generated keys for display
      setGeneratedPrivateKey(newPrivateKey);
      setGeneratedNsec(nsec);
      setGeneratedNpub(npub);
      
      // Show success message with the public key
      setSuccess(`Generated new key. Please save your private key before proceeding!`);
      
      // Don't automatically log in - we want the user to save their key first
    } catch (error) {
      setError('Failed to generate a new key. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Copy the private key to clipboard
  const handleCopyPrivateKey = () => {
    if (generatedPrivateKey) {
      navigator.clipboard.writeText(generatedPrivateKey);
      setSuccess('Private key (hex) copied to clipboard!');
    }
  };
  
  // Copy the nsec to clipboard
  const handleCopyNsec = () => {
    if (generatedNsec) {
      navigator.clipboard.writeText(generatedNsec);
      setSuccess('nsec key copied to clipboard!');
    }
  };
  
  // Copy the npub to clipboard
  const handleCopyNpub = () => {
    if (generatedNpub) {
      navigator.clipboard.writeText(generatedNpub);
      setSuccess('npub key copied to clipboard!');
    }
  };
  
  // Save the generated key and log in
  const handleSaveAndLogin = () => {
    if (generatedPrivateKey) {
      savePrivateKey(generatedPrivateKey);
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }
  };
  
  // Toggle visibility of private key
  const toggleShowPrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };
  
  return (
    <Card className={cn("max-w-md w-full mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-center">Login to Nostr</CardTitle>
        <CardDescription className="text-center">
          Connect with your existing Nostr key or create a new one
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="existing">Existing Key</TabsTrigger>
            <TabsTrigger value="new">Create New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing">
            <form onSubmit={handleExistingKeyLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="privateKey">Your Private Key</Label>
                <Input
                  id="privateKey"
                  type={showPrivateKey ? "text" : "password"}
                  placeholder="nsec... or hex private key"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="font-mono text-xs"
                />
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground">
                    Enter your hex private key or nsec key
                  </p>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleShowPrivateKey}
                    className="h-6 px-2"
                  >
                    {showPrivateKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                <KeyRound className="mr-2 h-4 w-4" />
                Log In
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="new" className="space-y-4">
            {generatedPrivateKey ? (
              <div className="space-y-4">
                <Alert variant="warning">
                  <AlertDescription className="font-semibold">
                    IMPORTANT: Save these keys now! They cannot be recovered if lost.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="npub">Public Key (npub)</Label>
                  <div className="relative">
                    <Input
                      id="npub"
                      readOnly
                      value={generatedNpub || ''}
                      className="font-mono text-xs pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyNpub}
                      className="absolute right-0 top-0 h-full px-3"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your public identity on Nostr
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nsec">Private Key (nsec)</Label>
                  <div className="relative">
                    <Input
                      id="nsec"
                      readOnly
                      value={generatedNsec || ''}
                      className="font-mono text-xs pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyNsec}
                      className="absolute right-0 top-0 h-full px-3"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your nsec private key - KEEP THIS SECRET
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="privateKey">Private Key (hex)</Label>
                  <div className="relative">
                    <Input
                      id="privateKey"
                      readOnly
                      value={generatedPrivateKey}
                      className="font-mono text-xs pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPrivateKey}
                      className="absolute right-0 top-0 h-full px-3"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your hex private key - KEEP THIS SECRET
                  </p>
                </div>
                
                <Button 
                  onClick={handleSaveAndLogin} 
                  className="w-full"
                >
                  I've Saved My Keys - Log In Now
                </Button>
              </div>
            ) : (
              <>
                <Alert>
                  <AlertDescription>
                    Creating a new key will generate a unique Nostr identity. Make sure to save your private key somewhere safe - it cannot be recovered if lost!
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleGenerateKey} 
                  className="w-full"
                  disabled={isGenerating}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate New Key'}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mt-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}