'use client';

import { useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import useClosetStore from '@/lib/store/closetStore';
import { ThemeProvider } from 'next-themes';

/**
 * Client provider component that ensures Zustand store is
 * properly hydrated before rendering child components
 */
export default function ClientProvider({ children }) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to be hydrated from localStorage
  useEffect(() => {
    // Force a rerender once the store has been hydrated from localStorage
    setIsHydrated(true);
  }, []);

  // Use this to debug store state during development
  const logStore = () => {
    if (process.env.NODE_ENV === 'development') {
      const state = useClosetStore.getState();
      console.log('Store state:', {
        clothingItems: state.clothingItems.length,
        outfits: state.outfits.length,
      });
    }
  };

  useEffect(() => {
    if (isHydrated) {
      logStore();
    }
  }, [isHydrated]);

  // Show nothing until hydration is complete to avoid hydration mismatch errors
  if (!isHydrated) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading your closet...</div>
    </div>;
  }

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}