'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import useClosetStore from '@/lib/store/closetStore';
import SwipeCard from '@/components/UI/SwipeCard';
import StyleChat from '@/components/Chat/StyleChat';

// Outfit categories for different types of styles
const STYLE_CATEGORIES = {
  'provocative': ['bra', 'underwear', 'bikini', 'swimwear', 'lingerie', 'intimate', 'bodysuit', 'mini', 'crop', 'sheer'],
  'formal': ['dress', 'suit', 'blazer', 'tie', 'heel', 'oxford', 'formal'],
  'casual': ['jeans', 't-shirt', 'sneaker', 'hoodie', 'shorts', 'casual'],
  'athletic': ['leggings', 'sports', 'athletic', 'workout', 'gym', 'yoga', 'running'],
  'business': ['blazer', 'office', 'professional', 'formal', 'suit', 'tie', 'blouse', 'slacks'],
  'evening': ['cocktail', 'dress', 'gown', 'formal', 'sequin', 'glitter', 'elegant'],
};

// Inappropriate combinations rules based on mood contexts
const INAPPROPRIATE_COMBINATIONS = {
  'bra': ['business', 'formal'],
  'underwear': ['business', 'formal'],
  'intimate': ['business', 'formal'],
  'swimwear': ['business', 'formal'],
  'bikini': ['business', 'formal'],
};

/**
 * Enhanced component for displaying AI-generated outfit recommendations with improved chat experience
 */
export default function OutfitRecommendations() {
  const { clothingItems, currentMood, setCurrentMood, isLoading, setLoading, outfits } = useClosetStore();
  const [recommendations, setRecommendations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [savedRecommendations, setSavedRecommendations] = useState([]);
  const [styleQuery, setStyleQuery] = useState('');
  const [isGeneratingStyle, setIsGeneratingStyle] = useState(false);
  const chatContainerRef = useRef(null);
  
  // Check if we have enough items for recommendations
  const hasEnoughItems = clothingItems.length >= 3;

  // Load saved recommendations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('saved-recommendations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedRecommendations(parsed);
      } catch (e) {
        console.error('Error parsing saved recommendations:', e);
      }
    }
  }, []);

  // Save recommendations to localStorage when they change
  useEffect(() => {
    if (savedRecommendations.length > 0) {
      localStorage.setItem('saved-recommendations', JSON.stringify(savedRecommendations));
    }
  }, [savedRecommendations]);

  // Handle mood selection
  const handleMoodChange = (e) => {
    setCurrentMood(e.target.value);
  };

  // Toggle between recommendations and chat
  const toggleChat = () => {
    setShowChat(prev => !prev);
  };

  // Match clothing items with style keywords from user query
  const findMatchingClothingItems = (query, items) => {
    if (!items || items.length === 0) return [];
    
    const queryLower = query.toLowerCase();
    
    // Enhanced style categories with more relevant keywords
    const ENHANCED_STYLE_CATEGORIES = {
      'sexy': ['sexy', 'hot', 'revealing', 'seductive', 'provocative', 'date night', 'party', 'clubbing', 'night out', 'attractive', 'flirty', 'body-con', 'bodycon', 'figure-hugging', 'slim-fit', 'tight', 'lingerie', 'bra', 'skimpy', 'low-cut', 'mini'],
      'professional': ['professional', 'work', 'office', 'business', 'formal', 'interview', 'corporate', 'meeting', 'presentation', 'conservative', 'polished', 'clean-cut', 'modest', 'elegant', 'sophisticated', 'tailored', 'blazer', 'suit', 'blouse', 'slacks', 'dress shirt'],
      'casual': ['casual', 'everyday', 'relaxed', 'comfortable', 'laid-back', 'informal', 'weekend', 'lounge', 'chill', 'easy-going', 'simple', 'tee', 't-shirt', 'jeans', 'shorts', 'hoodie', 'sneakers'],
      'athletic': ['athletic', 'sports', 'workout', 'gym', 'exercise', 'training', 'running', 'fitness', 'active', 'performance', 'sporty', 'leggings', 'joggers', 'sweatpants'],
      'party': ['party', 'celebration', 'festive', 'going out', 'evening', 'cocktail', 'club', 'dance', 'disco', 'sparkly', 'sequin', 'glitter', 'statement'],
      'date': ['date', 'romantic', 'dinner', 'special occasion', 'night out', 'charming', 'attractive', 'flattering'],
    };
    
    // Specific clothing item types
    const CLOTHING_TYPES = {
      'tops': ['shirt', 'blouse', 'top', 't-shirt', 'tee', 'tank', 'sweater', 'cardigan', 'blazer', 'jacket'],
      'bottoms': ['pants', 'jeans', 'shorts', 'skirt', 'slacks', 'trousers', 'leggings'],
      'dresses': ['dress', 'gown', 'jumpsuit', 'romper'],
      'shoes': ['shoes', 'heels', 'boots', 'sneakers', 'sandals', 'flats', 'loafers', 'oxfords'],
      'bras': ['bra', 'bralette', 'sports bra', 'bikini top'],
      'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'sweater', 'hoodie']
    };
    
    // Check for specific clothing item requests
    let requestedClothingTypes = [];
    for (const [type, keywords] of Object.entries(CLOTHING_TYPES)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        requestedClothingTypes.push(type);
      }
    }
    
    // Check if query explicitly mentions a style category
    let detectedStyles = [];
    for (const [style, keywords] of Object.entries(ENHANCED_STYLE_CATEGORIES)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        detectedStyles.push(style);
      }
    }
    
    // Filter items based on detected styles and requested clothing types
    let matchedItems = [];
    
    // First priority: Match both style and requested clothing type
    if (detectedStyles.length > 0 && requestedClothingTypes.length > 0) {
      matchedItems = items.filter(item => {
        const category = (item.category || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        
        // Check if item matches any requested clothing type
        const matchesClothingType = requestedClothingTypes.some(type => {
          return CLOTHING_TYPES[type].some(keyword => 
            category.includes(keyword) || description.includes(keyword)
          );
        });
        
        // Check if item matches any detected style
        const matchesStyle = detectedStyles.some(style => {
          return ENHANCED_STYLE_CATEGORIES[style].some(keyword => 
            category.includes(keyword) || description.includes(keyword)
          );
        });
        
        return matchesClothingType || matchesStyle;
      });
    }
    // Second priority: Match detected styles only
    else if (detectedStyles.length > 0) {
      matchedItems = items.filter(item => {
        const category = (item.category || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        
        return detectedStyles.some(style => {
          const styleKeywords = ENHANCED_STYLE_CATEGORIES[style];
          return styleKeywords.some(keyword => 
            category.includes(keyword) || description.includes(keyword)
          );
        });
      });
      
      // For specific styles, prioritize certain clothing items
      if (detectedStyles.includes('sexy') && matchedItems.length < 3) {
        // For sexy outfits, prioritize dresses, skirts, and form-fitting items
        const sexyItems = items.filter(item => {
          const category = (item.category || '').toLowerCase();
          return category.includes('dress') || category.includes('skirt') || 
                 category.includes('bodycon') || category.includes('lingerie') ||
                 category.includes('bra');
        });
        matchedItems = [...new Set([...matchedItems, ...sexyItems])];
      }
      
      if (detectedStyles.includes('professional') && matchedItems.length < 3) {
        // For professional outfits, prioritize blazers, suits, dress shirts
        const professionalItems = items.filter(item => {
          const category = (item.category || '').toLowerCase();
          return category.includes('blazer') || category.includes('suit') || 
                 category.includes('shirt') || category.includes('slacks') ||
                 category.includes('blouse');
        });
        matchedItems = [...new Set([...matchedItems, ...professionalItems])];
      }
    }
    // Third priority: Match requested clothing types only
    else if (requestedClothingTypes.length > 0) {
      matchedItems = items.filter(item => {
        const category = (item.category || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        
        return requestedClothingTypes.some(type => {
          return CLOTHING_TYPES[type].some(keyword => 
            category.includes(keyword) || description.includes(keyword)
          );
        });
      });
    }
    // Fourth priority: General keyword matching for anything else
    else {
      // Extract meaningful keywords from the query (words longer than 3 characters)
      const queryWords = queryLower
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['show', 'something', 'need', 'like', 'want', 'with', 'that', 'this', 'have', 'give', 'would', 'could', 'should'].includes(word));
      
      // If we have meaningful keywords, use them for matching
      if (queryWords.length > 0) {
        matchedItems = items.filter(item => {
          const category = (item.category || '').toLowerCase();
          const description = (item.description || '').toLowerCase();
          
          return queryWords.some(word => 
            category.includes(word) || description.includes(word)
          );
        });
      }
    }
    
    // If we still don't have enough items, add some based on categories that make sense for outfits
    if (matchedItems.length < 3) {
      // Ensure we have a good mix of tops, bottoms, and shoes for a complete outfit
      const tops = items.filter(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['tops'].some(keyword => category.includes(keyword));
      });
      
      const bottoms = items.filter(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['bottoms'].some(keyword => category.includes(keyword));
      });
      
      const dresses = items.filter(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['dresses'].some(keyword => category.includes(keyword));
      });
      
      const shoes = items.filter(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['shoes'].some(keyword => category.includes(keyword));
      });
      
      // Add some tops if we don't have enough
      if (tops.length > 0 && !matchedItems.some(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['tops'].some(keyword => category.includes(keyword));
      })) {
        matchedItems.push(tops[Math.floor(Math.random() * tops.length)]);
      }
      
      // Add some bottoms if we don't have enough (and no dresses)
      if (bottoms.length > 0 && !matchedItems.some(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['bottoms'].some(keyword => category.includes(keyword));
      }) && !matchedItems.some(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['dresses'].some(keyword => category.includes(keyword));
      })) {
        matchedItems.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
      }
      
      // Add some shoes if we don't have enough
      if (shoes.length > 0 && !matchedItems.some(item => {
        const category = (item.category || '').toLowerCase();
        return CLOTHING_TYPES['shoes'].some(keyword => category.includes(keyword));
      })) {
        matchedItems.push(shoes[Math.floor(Math.random() * shoes.length)]);
      }
      
      // If we still don't have enough items and there are dresses, add a dress
      if (matchedItems.length < 3 && dresses.length > 0) {
        const randomDress = dresses[Math.floor(Math.random() * dresses.length)];
        if (!matchedItems.some(item => item.id === randomDress.id)) {
          matchedItems.push(randomDress);
        }
      }
    }
    
    // Final fallback: If we still don't have enough items, use all items
    if (matchedItems.length < 3) {
      return items;
    }
    
    return matchedItems;
  };

  // Filter clothing items based on appropriateness for the selected mood
  const getAppropriateItems = (items, mood) => {
    return items.filter(item => {
      const category = item.category?.toLowerCase();
      if (!category) return true;
      
      // Check if this category is inappropriate for the selected mood
      for (const [inappropriateCategory, inappropriateMoods] of Object.entries(INAPPROPRIATE_COMBINATIONS)) {
        if (category.includes(inappropriateCategory) && inappropriateMoods.includes(mood)) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Generate personalized outfit recommendations based on user query
  const generateStyleRecommendations = async (query) => {
    if (!hasEnoughItems) {
      setError('Add at least 3 clothing items to get recommendations');
      return;
    }

    try {
      setIsGeneratingStyle(true);
      setError(null);
      setFeedback(null);
      
      // Find items that match the style query
      let matchingItems = findMatchingClothingItems(query, clothingItems);
      
      // If not enough matching items, use all appropriate items
      if (matchingItems.length < 3) {
        matchingItems = getAppropriateItems(clothingItems, currentMood);
      }
      
      if (matchingItems.length < 3) {
        setError(`Not enough appropriate items for "${query}". Try adding more clothing items.`);
        setIsGeneratingStyle(false);
        return;
      }
      
      // Call the recommendations API
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: matchingItems,
          mood: currentMood,
          styleQuery: query,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get recommendations');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.recommendations) {
        throw new Error('Failed to generate recommendations');
      }
      
      // Process recommendations - match IDs with actual items
      const processedRecommendations = result.recommendations.map(rec => {
        // Find the actual items based on IDs
        const outfitItems = rec.items
          .map(itemId => clothingItems.find(item => item.id === itemId))
          .filter(Boolean); // Remove any items that weren't found
        
        if (outfitItems.length === 0) {
          return null;
        }
        
        return {
          ...rec,
          outfitItems,
          query
        };
      }).filter(Boolean); // Remove null entries
      
      if (processedRecommendations.length === 0) {
        throw new Error(`Couldn't generate outfits for "${query}"`);
      }
      
      // Add to saved recommendations list
      setSavedRecommendations(prev => [
        ...processedRecommendations,
        ...prev
      ].slice(0, 20)); // Keep only the 20 most recent recommendations
      
      return processedRecommendations;
    } catch (err) {
      console.error('Recommendation error:', err);
      setError(`Failed to get recommendations: ${err.message}`);
      return null;
    } finally {
      setIsGeneratingStyle(false);
    }
  };

  // Generate recommendations from the traditional UI
  const generateRecommendations = async () => {
    if (!hasEnoughItems) {
      setError('Add at least 3 clothing items to get recommendations');
      return;
    }

    try {
      setLoading('recommendation', true);
      setError(null);
      setFeedback(null);
      
      // Filter items for the selected mood
      const appropriateItems = getAppropriateItems(clothingItems, currentMood);
      
      if (appropriateItems.length < 3) {
        setError(`Not enough appropriate items for ${currentMood} mood. Try adding more clothing items or selecting a different mood.`);
        setLoading('recommendation', false);
        return;
      }
      
      // Call the recommendations API
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: appropriateItems,
          mood: currentMood,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get recommendations');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.recommendations) {
        throw new Error('Failed to generate recommendations');
      }
      
      // Process recommendations - match IDs with actual items
      const processedRecommendations = result.recommendations.map(rec => {
        // Find the actual items based on IDs
        const outfitItems = rec.items
          .map(itemId => clothingItems.find(item => item.id === itemId))
          .filter(Boolean); // Remove any items that weren't found
        
        // Double-check that the outfit doesn't include inappropriate items
        const hasInappropriateItems = outfitItems.some(item => {
          const category = item.category?.toLowerCase();
          if (!category) return false;
          
          for (const [inappropriateCategory, inappropriateMoods] of Object.entries(INAPPROPRIATE_COMBINATIONS)) {
            if (category.includes(inappropriateCategory) && inappropriateMoods.includes(currentMood)) {
              return true;
            }
          }
          
          return false;
        });
        
        if (hasInappropriateItems) {
          return null; // Skip this recommendation
        }
          
        return {
          ...rec,
          outfitItems,
        };
      }).filter(rec => rec && rec.outfitItems.length > 0);
      
      if (processedRecommendations.length === 0) {
        throw new Error(`Couldn't generate appropriate outfits for ${currentMood} mood`);
      }
      
      setRecommendations(processedRecommendations);
      setCurrentIndex(0);
      setFeedback('Swipe right to save outfits you like, left to skip');
    } catch (err) {
      console.error('Recommendation error:', err);
      setError(`Failed to get recommendations: ${err.message}`);
    } finally {
      setLoading('recommendation', false);
    }
  };

  // Handle right swipe (save outfit)
  const handleSwipeRight = () => {
    if (recommendations.length === 0 || currentIndex >= recommendations.length) {
      return;
    }
    
    // Save this outfit
    const recommendation = recommendations[currentIndex];
    useClosetStore.getState().addOutfit({
      name: recommendation.name,
      description: recommendation.description,
      occasion: recommendation.occasion,
      items: recommendation.outfitItems.map(item => item.id),
      mood: currentMood,
    });
    
    setFeedback('Outfit saved to your collection!');
    setTimeout(() => setFeedback(null), 2000);
    
    // Move to next recommendation
    setCurrentIndex(prev => prev + 1);
  };

  // Handle left swipe (skip outfit)
  const handleSwipeLeft = () => {
    if (recommendations.length === 0 || currentIndex >= recommendations.length) {
      return;
    }
    
    // Move to next recommendation
    setCurrentIndex(prev => prev + 1);
  };

  // Handle style chat submission
  const handleStyleQuery = async (e) => {
    e.preventDefault();
    if (!styleQuery.trim() || isGeneratingStyle) return;
    
    const newRecommendations = await generateStyleRecommendations(styleQuery);
    if (newRecommendations) {
      // Add a system message to chat history
      setChatHistory(prev => [
        ...prev,
        {
          id: `query-${Date.now()}`,
          type: 'query',
          content: styleQuery,
          recommendations: newRecommendations
        }
      ]);
      
      setStyleQuery(''); // Clear the input field
      
      // Scroll to bottom of chat
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  // Add a function to save outfits from chat
  const handleSaveOutfitFromChat = (outfit) => {
    useClosetStore.getState().addOutfit({
      ...outfit,
      mood: outfit.mood || currentMood || 'casual', // Default to casual if no mood is specified
    });
    
    setFeedback('Outfit saved to your collection!');
    setTimeout(() => setFeedback(null), 2000);
  };

  // Clear chat history
  const clearChatHistory = () => {
    setChatHistory([]);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300">
        <h2 className="text-xl font-semibold mb-5 text-gray-900 dark:text-white">Your Style Assistant</h2>
        
        {/* Recommendation/Chat toggle - Always show this toggle */}
        <div className="flex mb-6">
          <button
            onClick={() => setShowChat(false)}
            className={`flex-1 py-2.5 px-4 rounded-l-lg text-sm font-medium transition-all duration-200 ${
              !showChat
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="flex items-center justify-center">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Outfit Wizard
            </span>
          </button>
          <button
            onClick={() => setShowChat(true)}
            className={`flex-1 py-2.5 px-4 rounded-r-lg text-sm font-medium transition-all duration-200 ${
              showChat
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="flex items-center justify-center">
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Style Advisor
            </span>
          </button>
        </div>
        
        {/* Traditional Recommendation UI */}
        {!showChat && (
          <>
            <div className="mb-6">
              <label htmlFor="mood" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                What&apos;s your mood today?
              </label>
              <div className="relative">
                <select
                  id="mood"
                  value={currentMood}
                  onChange={handleMoodChange}
                  disabled={isLoading.recommendation}
                  className="block w-full pl-4 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm transition-all duration-200 text-gray-900 dark:text-white"
                >
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="business">Business</option>
                  <option value="adventurous">Adventurous</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="athletic">Athletic</option>
                  <option value="provocative">Provocative</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <button
              onClick={generateRecommendations}
              disabled={!hasEnoughItems || isLoading.recommendation}
              className={`w-full py-3 px-4 rounded-lg shadow-sm text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                !hasEnoughItems || isLoading.recommendation
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow'
              }`}
            >
              {isLoading.recommendation ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating your personalized outfits...
                </>
              ) : (
                'Get AI Outfit Recommendations'
              )}
            </button>
            
            {!hasEnoughItems && (
              <div className="mt-3 flex items-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700/30">
                <svg className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Add at least 3 clothing items to your closet to get personalized recommendations
                  </p>
                  <button 
                    onClick={() => setShowChat(true)}
                    className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Chat with our AI style advisor instead →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Style Chat UI */}
        {showChat && (
          <div className="mx-auto">
            <div className="flex mb-4 items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Style Advisor</h3>
              {chatHistory.length > 0 && (
                <button 
                  onClick={clearChatHistory}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Clear History
                </button>
              )}
            </div>
            
            {/* Chat history display */}
            <div 
              ref={chatContainerRef}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 h-[400px] overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700"
            >
              {chatHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center">
                  <div>
                    <svg className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p>Type a style request below to get personalized outfit recommendations</p>
                    <p className="text-sm mt-2">Try: &quot;Show me party outfits&quot; or &quot;I need something sexy for a date&quot;</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {chatHistory.map((entry) => (
                    <div key={entry.id} className="space-y-3">
                      <div className="flex items-start">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 flex-shrink-0 mr-3">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 max-w-[85%]">
                          <p className="whitespace-pre-wrap">{entry.content}</p>
                        </div>
                      </div>
                      
                      {entry.recommendations && entry.recommendations.length > 0 && (
                        <div className="pl-11">
                          <div className="flex items-start">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 mr-3">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-4 py-3 shadow-sm border border-indigo-100 dark:border-indigo-800/30 text-gray-800 dark:text-gray-200 flex-1">
                              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-3">
                                I found {entry.recommendations.length} outfit{entry.recommendations.length !== 1 ? 's' : ''} for &quot;{entry.content}&quot;:
                              </p>
                              
                              <div className="space-y-4">
                                {entry.recommendations.map((outfit, index) => (
                                  <div key={`${outfit.id}-${index}`} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex justify-between">
                                      <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">{outfit.name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{outfit.occasion}</p>
                                      </div>
                                      <button
                                        onClick={() => handleSaveOutfitFromChat(outfit)}
                                        className="ml-2 p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
                                        title="Save to Collection"
                                      >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                      </button>
                                    </div>
                                    
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{outfit.description}</p>
                                    
                                    {/* Outfit Items */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {outfit.outfitItems.map(item => (
                                        <div key={item.id} className="relative w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                                          <Image
                                            src={item.image || item.thumbnail}
                                            alt={item.description || 'Outfit item'}
                                            className="object-contain"
                                            fill
                                            sizes="48px"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent top-1/2 flex items-end">
                                            <span className="text-[8px] text-white px-1 pb-0.5 truncate w-full text-center">
                                              {item.category}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Style chat input */}
            <form onSubmit={handleStyleQuery} className="relative">
              <input
                type="text"
                value={styleQuery}
                onChange={(e) => setStyleQuery(e.target.value)}
                placeholder="Describe what kind of outfit you're looking for..."
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isGeneratingStyle}
              />
              <button
                type="submit"
                disabled={!styleQuery.trim() || isGeneratingStyle}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 disabled:hover:text-gray-400 disabled:opacity-50"
              >
                {isGeneratingStyle ? (
                  <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            </form>
            
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              Try: &quot;Show me something sexy&quot; or &quot;I need a professional outfit for work&quot;
            </div>
          </div>
        )}
        
        {error && !showChat && (
          <div className="mt-3 flex items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-700/30">
            <svg className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button 
                onClick={() => setShowChat(true)}
                className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Try the style advisor instead →
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced AI Style Chat - Full component replaced with our custom implementation */}
      {showChat && hasEnoughItems && (
        <div className="hidden">
          <StyleChat 
            mood={currentMood} 
            onSaveOutfit={handleSaveOutfitFromChat}
          />
        </div>
      )}
      
      {/* Recommendations display */}
      {!showChat && recommendations.length > 0 && currentIndex < recommendations.length ? (
        <SwipeCard
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-300"
        >
          <div className="absolute top-3 right-3 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full flex items-center">
            <span className="h-2 w-2 bg-indigo-500 dark:bg-indigo-400 rounded-full mr-1.5 animate-pulse"></span>
            {currentIndex + 1} of {recommendations.length}
          </div>
          
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white pr-16">
            {recommendations[currentIndex].name}
          </h3>
          
          <div className="inline-flex items-center px-2.5 py-1 mb-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">
            <svg className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21V7a2 2 0 012-2h4a2 2 0 012 2v14M3 21h18" />
            </svg>
            {recommendations[currentIndex].occasion}
          </div>
          
          <p className="text-sm mb-5 text-gray-600 dark:text-gray-300 leading-relaxed">
            {recommendations[currentIndex].description}
          </p>
          
          <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Outfit Items:</h4>
          <div className="flex flex-wrap gap-3 mb-6">
            {recommendations[currentIndex].outfitItems.map((item) => (
              <div key={item.id} className="group relative w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-all duration-200">
                <Image
                  src={item.image || item.thumbnail}
                  alt={item.description}
                  className="object-contain group-hover:scale-105 transition-transform duration-200"
                  fill
                  sizes="80px"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1.5 px-1">
                  <div className="text-white text-center text-xs font-medium truncate">
                    {item.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Swipe left to skip, right to save</p>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-700">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
              style={{ width: `${((currentIndex + 1) / recommendations.length) * 100}%` }}
            ></div>
          </div>
        </SwipeCard>
      ) : !showChat && recommendations.length > 0 && currentIndex >= recommendations.length ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-all duration-300">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">All caught up!</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">You&apos;ve gone through all our suggestions. Ready for more inspiration?</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={generateRecommendations}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 font-medium"
            >
              Generate More Outfits
            </button>
            <button
              onClick={() => setShowChat(true)}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
            >
              Try Style Advisor
            </button>
          </div>
        </div>
      ) : null}
      
      {feedback && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-5 py-3 rounded-lg shadow-xl z-50 flex items-center animate-fade-in-up">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {feedback}
        </div>
      )}
    </div>
  );
}