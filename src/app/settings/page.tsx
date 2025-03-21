'use client';

import { Header } from '@/components/layout/Header';
import { ClientWrapper } from '@/components/ClientWrapper';
import { Redirect } from '@/components/Redirect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { getSavedRelays, addRelay, removeRelay } from '@/lib/nostr/relays';
import { hexToNpub, hexToNsec, getPrivateKey, clearPrivateKey } from '@/lib/nostr/keys';
import { updateUserMetadata } from '@/lib/nostr/events';
import { useNostrProfile } from '@/lib/nostr/hooks';

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background">
      <ClientWrapper>
        {({ isLoggedIn, isLoading, publicKey }) => (
          <>
            {!isLoading && !isLoggedIn && <Redirect to="/" />}
            
            <Header />
            
            {isLoading ? (
              <div className="container p-4 mx-auto max-w-6xl flex justify-center items-center min-h-[50vh]">
                <p>Loading...</p>
              </div>
            ) : (
              <div className="container p-4 mx-auto max-w-6xl">
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-2xl font-bold mb-6">Settings</h1>
                  
                  <Tabs defaultValue="relays" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 mb-6">
                      <TabsTrigger value="relays">Relays</TabsTrigger>
                      <TabsTrigger value="profile">Profile</TabsTrigger>
                      <TabsTrigger value="account">Account</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="relays">
                      <Card>
                        <CardHeader>
                          <CardTitle>Relay Management</CardTitle>
                          <CardDescription>
                            Configure which Nostr relays to connect to
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <RelaySettings />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="profile">
                      <Card>
                        <CardHeader>
                          <CardTitle>Profile Settings</CardTitle>
                          <CardDescription>
                            Update your profile information
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {publicKey && <ProfileSettings pubkey={publicKey} />}
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="account">
                      <Card>
                        <CardHeader>
                          <CardTitle>Account Settings</CardTitle>
                          <CardDescription>
                            Manage your account and keys
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {publicKey && <AccountSettings pubkey={publicKey} />}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </>
        )}
      </ClientWrapper>
    </main>
  );
}

// Client components
function RelaySettings() {
  const [relays, setRelays] = useState<string[]>(getSavedRelays());
  const [newRelay, setNewRelay] = useState("");
  
  const handleAddRelay = () => {
    if (!newRelay || !newRelay.startsWith('wss://')) return;
    
    addRelay(newRelay);
    setRelays(getSavedRelays());
    setNewRelay("");
  };
  
  const handleRemoveRelay = (url: string) => {
    removeRelay(url);
    setRelays(getSavedRelays());
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newRelay">Add New Relay</Label>
        <div className="flex space-x-2">
          <Input 
            id="newRelay" 
            placeholder="wss://relay.example.com" 
            value={newRelay}
            onChange={(e) => setNewRelay(e.target.value)}
          />
          <Button onClick={handleAddRelay}>Add</Button>
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Connected Relays</h3>
        <div className="space-y-2">
          {relays.length > 0 ? (
            relays.map((relay) => (
              <div key={relay} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">{relay}</p>
                  <p className="text-xs text-muted-foreground">Connected</p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemoveRelay(relay)}
                >
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No relays configured</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ pubkey }: { pubkey: string }) {
  const { profile, isLoading, refetch } = useNostrProfile(pubkey);
  const [formData, setFormData] = useState({
    name: '',
    about: '',
    picture: '',
    website: '',
    nip05: '',
  });
  
  // Load profile data
  useState(() => {
    if (profile && !isLoading) {
      setFormData({
        name: profile.name || '',
        about: profile.about || '',
        picture: profile.picture || '',
        website: profile.website || '',
        nip05: profile.nip05 || '',
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSaveProfile = async () => {
    const updatedProfile = {
      ...formData
    };
    
    await updateUserMetadata(updatedProfile);
    refetch();
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input 
          id="name" 
          placeholder="Your name" 
          value={formData.name}
          onChange={handleInputChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="about">About</Label>
        <Input 
          id="about" 
          placeholder="Tell us about yourself" 
          value={formData.about}
          onChange={handleInputChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="picture">Profile Picture URL</Label>
        <Input 
          id="picture" 
          placeholder="https://example.com/avatar.jpg" 
          value={formData.picture}
          onChange={handleInputChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input 
          id="website" 
          placeholder="https://your-website.com" 
          value={formData.website}
          onChange={handleInputChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="nip05">NIP-05 Identifier</Label>
        <Input 
          id="nip05" 
          placeholder="you@example.com" 
          value={formData.nip05}
          onChange={handleInputChange}
        />
      </div>
      
      <Button onClick={handleSaveProfile}>Save Profile</Button>
    </div>
  );
}

function AccountSettings({ pubkey }: { pubkey: string }) {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const privateKey = getPrivateKey();
  const npub = hexToNpub(pubkey);
  const nsec = privateKey ? hexToNsec(privateKey) : '';
  
  const handleCopyNpub = () => {
    navigator.clipboard.writeText(npub);
  };
  
  const handleExportKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };
  
  const handleCopyNsec = () => {
    navigator.clipboard.writeText(nsec);
  };
  
  const handleLogout = () => {
    clearPrivateKey();
    window.location.reload();
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Your Public Key</h3>
        <div className="relative">
          <Input readOnly value={npub} className="pr-20 font-mono text-xs" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-0 top-0 h-full"
            onClick={handleCopyNpub}
          >
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This is your public identity on Nostr
        </p>
      </div>
      
      <Separator />
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Export Private Key</h3>
        <Button variant="outline" onClick={handleExportKey}>
          {showPrivateKey ? 'Hide Private Key' : 'Show Private Key'}
        </Button>
        
        {showPrivateKey && (
          <div className="mt-2">
            <div className="relative">
              <Input readOnly value={nsec} className="pr-20 font-mono text-xs" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute right-0 top-0 h-full"
                onClick={handleCopyNsec}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-red-500 mt-1">
              Warning: Never share your private key with anyone. It gives full control over your Nostr identity.
            </p>
          </div>
        )}
      </div>
      
      <Separator />
      
      <div>
        <Button variant="destructive" onClick={handleLogout}>Logout</Button>
      </div>
    </div>
  );
}