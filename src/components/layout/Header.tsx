import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, UserCircle, Wifi, WifiOff } from 'lucide-react';
import { useNostrUser } from '@/lib/nostr/hooks';
import { clearPrivateKey, getCurrentUserPublicKey, hexToNpub } from '@/lib/nostr/keys';
import { getActiveRelayUrls } from '@/lib/nostr/relays';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { isLoggedIn, publicKey } = useNostrUser();
  const [relays, setRelays] = React.useState<string[]>([]);
  
  // Get active relays
  React.useEffect(() => {
    const timer = setInterval(() => {
      setRelays(getActiveRelayUrls());
    }, 2000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Handle logout
  const handleLogout = () => {
    clearPrivateKey();
    window.location.reload();
  };
  
  // Get truncated npub if available
  const shortenedNpub = publicKey ? 
    `${hexToNpub(publicKey).slice(0, 8)}...${hexToNpub(publicKey).slice(-4)}` : 
    '';
  
  return (
    <header className={cn("border-b sticky top-0 bg-background z-10", className)}>
      <div className="container flex h-14 items-center px-4 max-w-6xl">
        <div className="flex flex-1 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">NostrMini</span>
          </Link>
          
          <nav className="flex items-center space-x-4">
            {isLoggedIn && (
              <div className="flex items-center gap-2">
                {relays.length > 0 ? (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Wifi className="w-3 h-3 mr-1 text-green-500" />
                    <span>{relays.length} relay{relays.length !== 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <WifiOff className="w-3 h-3 mr-1 text-red-500" />
                    <span>Connecting...</span>
                  </div>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {shortenedNpub.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <span className="block text-xs font-mono truncate max-w-32">
                        {shortenedNpub}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}