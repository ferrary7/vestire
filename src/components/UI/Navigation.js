'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import useClosetStore from '@/lib/store/closetStore';

/**
 * Main navigation component for the app
 */
export default function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { setUser, initializeUserData } = useClosetStore();
  const profileRef = useRef(null);
  
  // Handle theme mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Set user data in store when session changes
  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
      initializeUserData();
    } else {
      setUser(null);
    }
  }, [session, setUser, initializeUserData]);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileRef]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Navigation items
  const navItems = [
    { name: 'My Closet', href: '/', active: pathname === '/' },
    { name: 'Add Item', href: '/add', active: pathname === '/add' },
    { name: 'Outfits', href: '/outfits', active: pathname === '/outfits' },
    { name: 'Recommendations', href: '/recommendations', active: pathname === '/recommendations' },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-gray-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center group">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">
                Vestire
              </span>
            </Link>
            
            {/* Desktop navigation */}
            <div className="hidden sm:ml-10 sm:flex sm:space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative group px-3 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                    item.active
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-300'
                  }`}
                >
                  <span className="relative z-10">{item.name}</span>
                  {item.active ? (
                    <span className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-md" />
                  ) : (
                    <span className="absolute inset-0 scale-95 opacity-0 bg-gray-50 dark:bg-gray-800/30 rounded-md group-hover:opacity-100 group-hover:scale-100 transition-all duration-200" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            {mounted && (
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 transform hover:scale-110"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}
            
            {/* User profile */}
            <div className="relative" ref={profileRef}>
              {session ? (
                <div>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 transition-all duration-200"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="true"
                  >
                    <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-indigo-100 dark:ring-indigo-900 transition-all duration-300">
                      <Image
                        src={session.user.image || '/placeholder-image.svg'}
                        alt={session.user.name || 'User'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </button>
                  
                  {/* Profile dropdown with animation */}
                  <div 
                    className={`absolute right-0 mt-2 w-64 rounded-xl shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-10 overflow-hidden transform transition-all duration-200 origin-top-right ${
                      isProfileMenuOpen 
                        ? 'opacity-100 translate-y-0 scale-100' 
                        : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                    }`}
                  >
                    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={session.user.image || '/placeholder-image.svg'}
                            alt={session.user.name || 'User'}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{session.user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.user.email}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center py-2 px-4 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
                >
                  <Image 
                    src="/google-logo.svg" 
                    alt="Google" 
                    width={16} 
                    height={16} 
                    className="mr-2"
                  />
                  Sign in
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu with smooth transition */}
      <div 
        className={`sm:hidden border-t border-gray-200 dark:border-gray-800 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95 transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-2 pb-3 space-y-1 px-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 ${
                item.active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}