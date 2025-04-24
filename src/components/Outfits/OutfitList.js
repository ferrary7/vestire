'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import useClosetStore from '@/lib/store/closetStore';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Component to display the list of saved outfits
 */
export default function OutfitList() {
  const { outfits, clothingItems, removeOutfit, isLoading, user } = useClosetStore();
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [expandedOutfit, setExpandedOutfit] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!session && !user) {
      router.push('/auth/signin');
    }
  }, [session, user, router]);

  // Get clothing items for an outfit
  const getOutfitItems = (outfitItemIds) => {
    return outfitItemIds.map(id => clothingItems.find(item => item.id === id)).filter(Boolean);
  };

  // Handle deletion of an outfit
  const handleDelete = async (outfitId) => {
    try {
      setDeleteError(null);
      await removeOutfit(outfitId);
      setShowConfirmDelete(null);
    } catch (error) {
      console.error("Failed to delete outfit:", error);
      setDeleteError(`Failed to delete outfit: ${error.message || 'Unknown error'}`);
      setTimeout(() => setDeleteError(null), 3000);
    }
  };

  // If not authenticated, show loading or redirect
  if (!session && !user) {
    return null; // Will be redirected in the useEffect
  }

  return (
    <div className="space-y-6">
      {deleteError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-4 rounded-lg text-red-700 dark:text-red-300 mb-4">
          {deleteError}
        </div>
      )}
      
      {outfits.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {outfits.map((outfit) => {
            const outfitItems = getOutfitItems(outfit.items || []);
            const isExpanded = expandedOutfit === outfit.id;
            const isDeleting = isLoading?.sync && showConfirmDelete === outfit.id;
            
            return (
              <div 
                key={outfit.id} 
                className={`group bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 hover:shadow-md ${isExpanded ? 'sm:col-span-2 md:col-span-2' : ''}`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      {outfit.name}
                    </h3>
                    
                    <button 
                      onClick={() => setExpandedOutfit(isExpanded ? null : outfit.id)}
                      className="text-gray-400 hover:text-indigo-500 transition-colors p-1"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {outfit.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {outfit.description}
                    </p>
                  )}
                  
                  <div className={`flex flex-wrap gap-3 mb-5 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                    {outfitItems.map((item) => (
                      <div 
                        key={item.id}
                        className="relative group/item"
                      >
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-200 group-hover/item:shadow-md">
                          <div className="relative w-full h-full">
                            <Image
                              src={item.image || item.thumbnail}
                              alt={item.description || 'Clothing item'}
                              className="object-contain"
                              fill
                              sizes="80px"
                            />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-center text-xs py-1 font-medium">
                          {item.category}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(outfit.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    
                    {showConfirmDelete === outfit.id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowConfirmDelete(null)}
                          disabled={isDeleting}
                          className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(outfit.id)}
                          disabled={isDeleting}
                          className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
                        >
                          {isDeleting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Deleting...
                            </>
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowConfirmDelete(outfit.id)}
                        className="text-xs px-3 py-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 p-12 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">No Outfits Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start creating your first outfit by combining items from your closet.
            </p>
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                Create Your First Outfit Above
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}