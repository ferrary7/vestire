'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useClosetStore from '@/lib/store/closetStore';

/**
 * Component to display the user's clothing items in a filterable grid
 */
export default function ClothingGrid({ filter = null, searchQuery = '' }) {
  const { clothingItems } = useClosetStore();
  
  // Apply filters to clothing items
  const filteredItems = useMemo(() => {
    return clothingItems.filter(item => {
      // Category filter
      if (filter && item.category !== filter) {
        return false;
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const description = (item.description || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const season = (item.season || '').toLowerCase();
        if (!description.includes(query) && !category.includes(query) && !season.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [clothingItems, filter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Results count */}
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
        <span>
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
          {filter && <span className="ml-1">in <span className="font-medium capitalize text-indigo-600 dark:text-indigo-400">{filter}</span></span>}
          {searchQuery && <span className="ml-1">matching <span className="font-medium text-indigo-600 dark:text-indigo-400">{searchQuery}</span></span>}
        </span>
      </div>
      
      {/* Clothing grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <ClothingItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex flex-col items-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 mb-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No items found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {clothingItems.length === 0
                ? "Your digital closet is empty. Add some items to get started!"
                : "Try adjusting your filters or search query to find what you're looking for."}
            </p>
            {clothingItems.length === 0 && (
              <Link 
                href="/add" 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Add your first item
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual clothing item card component
 */
function ClothingItem({ item }) {
  const { removeClothingItem } = useClosetStore();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-300 group"
      style={{
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : ''
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative pt-[100%] bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
        
        <Image
          src={item.image || item.thumbnail || '/placeholder-image.svg'}
          alt={item.description || 'Clothing item'}
          className="object-contain transition-transform duration-500 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        />
        
        {/* Season badge */}
        {item.season && item.season !== 'all' && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-medium text-gray-700 dark:text-gray-300 rounded-full shadow-sm z-10">
            {item.season.charAt(0).toUpperCase() + item.season.slice(1)}
          </div>
        )}
        
        {/* Hover actions */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        >
          <div className="absolute bottom-3 inset-x-0 flex justify-center space-x-3">
            <button
              onClick={() => {/* View detail in future */}}
              className="p-2.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
              title="View details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800 dark:text-gray-200" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-2.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Remove item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Confirmation modal */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg max-w-xs w-full">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Delete Item</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Are you sure you want to remove this item? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeClothingItem(item.id)}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="capitalize text-sm font-semibold text-gray-900 dark:text-gray-100">{item.category}</span>
          {item.color && (
            <div 
              className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" 
              style={{ backgroundColor: item.color || '#cccccc' }} 
              title={`Color: ${item.color}`}
            />
          )}
        </div>
        
        <p className="text-sm line-clamp-2 h-10 text-gray-600 dark:text-gray-400 mb-1">
          {item.description || 'No description'}
        </p>
        
        <div className="flex items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          {item.season === 'all' ? (
            <span className="text-xs inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              All Seasons
            </span>
          ) : (
            <span className="text-xs inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 capitalize">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {item.season}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}