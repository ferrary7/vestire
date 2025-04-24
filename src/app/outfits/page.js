'use client';

import { Suspense, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import OutfitCanvas from '@/components/Outfits/OutfitCanvas';
import OutfitList from '@/components/Outfits/OutfitList';
import { useRouter } from 'next/navigation';
import useClosetStore from '@/lib/store/closetStore';

export default function OutfitsPage() {
  const { user } = useClosetStore();
  const router = useRouter();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Redirect to sign in page if user is not authenticated
    if (!user) {
      router.push('/auth/signin');
    }
  }, [user, router]);

  useEffect(() => {
    // Check if the device is a touch device
    const touchDevice = ('ontouchstart' in window) || 
      (navigator.maxTouchPoints > 0) || 
      (navigator.msMaxTouchPoints > 0);
    
    setIsTouchDevice(touchDevice);
  }, []);

  // If not authenticated, show loading or return null
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Authentication Required</h2>
          <p className="text-gray-500 dark:text-gray-400">Redirecting to sign in page...</p>
        </div>
      </div>
    );
  }

  // Choose the backend based on the device type
  const backend = isTouchDevice ? TouchBackend : HTML5Backend;

  return (
    <DndProvider backend={backend}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero section */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Design Your Style
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Bring your fashion vision to life by combining pieces from your collection into unique, personalized outfits.
          </p>
        </div>
        
        {/* Outfit Creation Section */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Create Outfit</h2>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-grow mx-4"></div>
            <span className="text-sm px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
              Drag & Drop
            </span>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <Suspense fallback={
              <div className="p-12 animate-pulse flex flex-col items-center justify-center">
                <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            }>
              <OutfitCanvas />
            </Suspense>
          </div>
        </section>
        
        {/* Saved Outfits Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Your Collection</h2>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-grow mx-4"></div>
            <span className="text-sm px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
              Saved Outfits
            </span>
          </div>
          
          <Suspense fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                  <div className="flex gap-2 mb-6">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="w-1/6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          }>
            <OutfitList />
          </Suspense>
        </section>
      </div>
    </DndProvider>
  );
}