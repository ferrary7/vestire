'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import ClothingGrid from '@/components/Clothing/ClothingGrid';

export default function HomeClient() {
  const { data: session, status } = useSession();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filters = [
    { id: 'all', label: 'All Items' },
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'outerwear', label: 'Outerwear' },
    { id: 'footwear', label: 'Footwear' },
    { id: 'accessories', label: 'Accessories' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Your Digital Wardrobe
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {session 
            ? `Welcome back, ${session.user.name.split(' ')[0]}! Manage your personal collection and create stylish outfits.`
            : 'Organize your clothes, create outfits, and discover your style with AI-powered recommendations.'}
        </p>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 bg-indigo-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Collection</h2>
        </div>
        
        {session && (
          <Link 
            href="/add" 
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Add New Item
          </Link>
        )}
      </div>
      
      {!session && status !== 'loading' ? (
        <div className="rounded-xl overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-800/20 backdrop-blur-sm p-8 md:p-12">
            <div className="md:flex md:items-center md:justify-between">
              <div className="md:max-w-xl">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-4">Get Started With Vestire</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                  Create your digital closet, organize outfits, and get AI-powered style recommendations tailored just for you.
                </p>
                <button
                  onClick={() => signIn('google')}
                  className="inline-flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Image 
                    src="/google-logo.svg" 
                    alt="Google" 
                    width={20} 
                    height={20} 
                    className="w-5 h-5"
                  />
                  Sign in with Google
                </button>
              </div>
              <div className="hidden md:block mt-8 md:mt-0">
                <div className="relative w-64 h-64">
                  <Image
                    src="/placeholder-image.svg"
                    alt="Wardrobe illustration"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Search bar */}
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search your closet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 pl-12 pr-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                />
                <svg 
                  className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Filter pills - mobile view shows select dropdown */}
              <div className="sm:hidden">
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                >
                  {filters.map(filter => (
                    <option key={filter.id} value={filter.id}>{filter.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Filter pills - desktop view */}
            <div className="hidden sm:flex flex-wrap gap-2 mt-5">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === filter.id
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 shadow-sm'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Clothing grid with filter and search applied */}
          <ClothingGrid filter={activeFilter === 'all' ? null : activeFilter} searchQuery={searchQuery} />
        </>
      )}
      
      {/* Features Section (visible when not signed in) */}
      {!session && status !== 'loading' && (
        <div className="py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Simplify Your Wardrobe Management
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Vestire provides all the tools you need to organize, plan, and enhance your personal style.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Digital Closet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload and categorize your clothing items in one centralized digital wardrobe.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Create Outfits</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Mix and match items to create and save perfect outfit combinations for any occasion.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">AI Style Advice</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get personalized outfit recommendations based on your wardrobe, style, and preferences.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}