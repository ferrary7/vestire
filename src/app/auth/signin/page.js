'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error('Authentication error:', error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full px-6 py-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">Welcome to Vestire</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Sign in to access your digital closet
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-70"
          >
            <Image 
              src="/google-logo.svg" 
              alt="Google logo" 
              width={20} 
              height={20} 
              className="h-5 w-5"
            />
            <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              By signing in, you agree to our Terms and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}