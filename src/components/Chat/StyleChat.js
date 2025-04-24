'use client';

import { useState, useRef, useEffect } from 'react';
import useClosetStore from '@/lib/store/closetStore';
import Image from 'next/image';

/**
 * Enhanced StyleChat component for conversational interactions with the AI stylist
 * Analyzes user messages for style preferences and suggests outfits from the database
 */
export default function StyleChat({ mood, onSaveOutfit }) {
  const { user, clothingItems, outfits } = useClosetStore();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi there! I\'m your personal style assistant. I can help you with fashion advice, outfit ideas, and style tips. Just tell me what look you\'re going for or how you\'re feeling today!',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [suggestedOutfits, setSuggestedOutfits] = useState([]);
  const messagesEndRef = useRef(null);

  // Load chat history from localStorage when component mounts
  useEffect(() => {
    const savedChats = localStorage.getItem('style-chat-history');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        if (Array.isArray(parsedChats)) {
          setChatHistory(parsedChats);
        }
      } catch (error) {
        console.error('Error parsing saved chats:', error);
      }
    }
  }, []);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestedOutfits]);

  // Helper function to detect occasion from the message
  const detectOccasionFromMessage = (message) => {
    const messageLower = message.toLowerCase();
    
    // Occasion keywords
    const occasionMapping = {
      'work': ['work', 'office', 'business', 'professional', 'meeting', 'interview'],
      'date': ['date', 'romantic', 'dinner', 'night out', 'sexy', 'hot'],
      'party': ['party', 'celebration', 'club', 'festive', 'dance'],
      'casual': ['casual', 'everyday', 'day-to-day', 'relaxed', 'home'],
      'formal': ['formal', 'elegant', 'fancy', 'dressed up', 'classy', 'gala'],
      'workout': ['workout', 'exercise', 'gym', 'fitness', 'run', 'training'],
      'outdoor': ['outdoor', 'hiking', 'picnic', 'beach', 'park', 'nature'],
      'travel': ['travel', 'vacation', 'trip', 'holiday', 'journey', 'adventure']
    };
    
    for (const [occasion, keywords] of Object.entries(occasionMapping)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return occasion;
      }
    }
    
    return 'any'; // Default if no specific occasion detected
  };

  // Analyze user message for style keywords and match with existing outfits
  const analyzeMessageForOutfits = (message, mood) => {
    if (!outfits || outfits.length === 0) return [];
    
    // Keywords to look for in user messages
    const styleKeywords = {
      casual: ['casual', 'relaxed', 'everyday', 'chill', 'comfortable', 'relax', 'laid back', 'easy going'],
      formal: ['formal', 'elegant', 'fancy', 'dressed up', 'professional', 'sophisticated', 'classy'],
      business: ['business', 'work', 'office', 'professional', 'meeting', 'interview', 'corporate'],
      adventurous: ['adventurous', 'bold', 'creative', 'unique', 'statement', 'fun', 'colorful', 'exciting'],
      relaxed: ['relaxed', 'lounge', 'cozy', 'homey', 'comfortable', 'calm', 'chill'],
      athletic: ['athletic', 'sporty', 'workout', 'gym', 'active', 'exercise', 'running', 'sport']
    };
    
    // Occasion keywords to look for
    const occasionKeywords = {
      'date night': ['date', 'romantic', 'dinner', 'night out'],
      'party': ['party', 'celebration', 'festive', 'club', 'dance'],
      'work': ['work', 'office', 'business', 'meeting', 'professional'],
      'weekend': ['weekend', 'casual', 'day off', 'relaxed'],
      'outdoor': ['outdoor', 'nature', 'hiking', 'picnic', 'park', 'beach'],
      'vacation': ['vacation', 'holiday', 'travel', 'trip']
    };
    
    // Color keywords
    const colorKeywords = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'purple', 'pink', 'orange', 'brown', 'gray', 'grey', 'dark', 'light', 'bright', 'neutral', 'pastel', 'colorful'];
    
    // Season keywords
    const seasonKeywords = {
      'summer': ['summer', 'hot', 'warm', 'beach', 'sun'],
      'winter': ['winter', 'cold', 'snow', 'freezing', 'chilly'],
      'spring': ['spring', 'mild', 'fresh', 'bloom'],
      'fall': ['fall', 'autumn', 'cool', 'crisp', 'leaves']
    };
    
    // Weather keywords
    const weatherKeywords = {
      'rainy': ['rain', 'rainy', 'wet', 'drizzle', 'storm', 'umbrella'],
      'sunny': ['sun', 'sunny', 'bright', 'clear'],
      'cold': ['cold', 'chilly', 'freezing', 'frost'],
      'hot': ['hot', 'warm', 'heat', 'sweaty']
    };
    
    // Special style keywords
    const specialStyleKeywords = {
      'sexy': ['sexy', 'hot', 'revealing', 'date night', 'attractive', 'seductive'],
      'professional': ['professional', 'work', 'business', 'office', 'formal', 'interview'],
      'trendy': ['trendy', 'fashionable', 'stylish', 'hip', 'cool', 'in style'],
      'vintage': ['vintage', 'retro', 'classic', 'old school', 'throwback'],
      'minimalist': ['minimalist', 'simple', 'clean', 'basic', 'understated'],
      'bohemian': ['bohemian', 'boho', 'hippie', 'free-spirited', 'earthy']
    };
    
    const messageLower = message.toLowerCase();
    
    // Detect mood from message if none provided
    let detectedMood = mood;
    if (!detectedMood) {
      for (const [mood, keywords] of Object.entries(styleKeywords)) {
        if (keywords.some(keyword => messageLower.includes(keyword))) {
          detectedMood = mood;
          break;
        }
      }
    }
    
    // Detect occasion from message
    let detectedOccasions = [];
    for (const [occasion, keywords] of Object.entries(occasionKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        detectedOccasions.push(occasion);
      }
    }
    
    // Detect special style from message
    let detectedStyles = [];
    for (const [style, keywords] of Object.entries(specialStyleKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        detectedStyles.push(style);
      }
    }
    
    // Detect colors from message
    const detectedColors = colorKeywords.filter(color => messageLower.includes(color));
    
    // Detect season from message
    let detectedSeason = null;
    for (const [season, keywords] of Object.entries(seasonKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        detectedSeason = season;
        break;
      }
    }
    
    // Detect weather from message
    let detectedWeather = null;
    for (const [weather, keywords] of Object.entries(weatherKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        detectedWeather = weather;
        break;
      }
    }
    
    // Score outfits based on how well they match the detected parameters
    const scoredOutfits = outfits.map(outfit => {
      let score = 0;
      
      // Score based on mood match
      if (detectedMood && outfit.mood === detectedMood) {
        score += 5;
      }
      
      // Score based on occasion match
      if (outfit.occasion && detectedOccasions.length > 0) {
        for (const occasion of detectedOccasions) {
          if (outfit.occasion.toLowerCase().includes(occasion)) {
            score += 3;
          }
        }
      }
      
      // Score based on special style match
      if (outfit.name && detectedStyles.length > 0) {
        for (const style of detectedStyles) {
          if (outfit.name.toLowerCase().includes(style) || 
              (outfit.description && outfit.description.toLowerCase().includes(style))) {
            score += 5; // Strong match for special styles
          }
        }
      }
      
      // Score based on description matches
      if (outfit.description) {
        const descLower = outfit.description.toLowerCase();
        
        // Color matches in description
        for (const color of detectedColors) {
          if (descLower.includes(color)) {
            score += 2;
          }
        }
        
        // Season matches in description
        if (detectedSeason && descLower.includes(detectedSeason)) {
          score += 2;
        }
        
        // Weather matches in description
        if (detectedWeather && descLower.includes(detectedWeather)) {
          score += 2;
        }
        
        // Check for generic keyword matches in description
        for (const keyword of messageLower.split(' ')) {
          if (keyword.length > 3 && descLower.includes(keyword)) {
            score += 1;
          }
        }
      }
      
      return {
        outfit,
        score,
        matchedMood: detectedMood,
        matchedOccasions: detectedOccasions,
        matchedStyles: detectedStyles
      };
    });
    
    // Sort by score and return top matches
    const matchingOutfits = scoredOutfits
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    return matchingOutfits;
  };

  // Add processing to clean up message content
  const processMessageContent = (content) => {
    if (!content) return '';
    
    // Remove MongoDB IDs (24-character hexadecimal strings in the format #id)
    // Format example: (#680a75a8eb63b066b3d55720)
    return content.replace(/(#[0-9a-f]{24})/g, '')
      // Clean up any leftover parentheses that might be empty after ID removal
      .replace(/\(\s*\)/g, '')
      // Fix any double spaces created by the removals
      .replace(/\s{2,}/g, ' ')
      // Fix any spaces before punctuation
      .replace(/\s+([.,!?])/g, '$1');
  };

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // The user's query
    const styleQuery = input.trim();
    
    try {
      // First, analyze the message for outfit matches from existing outfits
      const matchingOutfits = analyzeMessageForOutfits(styleQuery, mood);
      
      // If we have existing matches, use them
      if (matchingOutfits.length > 0) {
        setSuggestedOutfits(matchingOutfits.map(match => match.outfit));
      } else {
        // Otherwise, try to generate new recommendations using the recommendations API
        try {
          const occasion = detectOccasionFromMessage(styleQuery);
          
          const recommendResponse = await fetch('/api/recommendations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mood: mood || 'casual',
              styleQuery: styleQuery,
              occasion: occasion,
              season: 'any'
            }),
          });
          
          if (recommendResponse.ok) {
            const recommendData = await recommendResponse.json();
            
            if (recommendData.recommendations && recommendData.recommendations.length > 0) {
              // Format the AI-generated recommendations to match our outfit structure
              const formattedRecommendations = recommendData.recommendations.map(rec => ({
                id: `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: rec.name,
                items: rec.items || [],
                description: rec.description,
                styling_tips: rec.styling_tips,
                occasion: occasion,
                generated: true
              }));
              
              setSuggestedOutfits(formattedRecommendations);
            }
          }
        } catch (recError) {
          console.error('Error getting recommendations:', recError);
          // continue with chat response even if recommendations fail
        }
      }

      // Call the chat API to get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: styleQuery,
          mood: mood,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get a response');
      }

      const data = await response.json();
      
      // Add AI response to chat
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save the conversation to history
      const conversation = {
        id: Date.now().toString(),
        title: userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : ''),
        messages: [...messages, userMessage, assistantMessage],
        timestamp: new Date().toISOString()
      };

      setChatHistory(prev => {
        const updated = [conversation, ...prev].slice(0, 10); // Keep only the 10 most recent conversations
        localStorage.setItem('style-chat-history', JSON.stringify(updated));
        return updated;
      });

    } catch (error) {
      console.error('Error getting AI response:', error);
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: 'Sorry, I couldn\'t process your request. Please try again.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle starting a new chat
  const handleNewChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hi there! I\'m your personal style assistant. I can help you with fashion advice, outfit ideas, and style tips. Just tell me what look you\'re going for or how you\'re feeling today!',
        timestamp: new Date().toISOString()
      }
    ]);
    setSuggestedOutfits([]);
  };

  // Load a saved chat conversation
  const loadConversation = (conversation) => {
    setMessages(conversation.messages);
    setSuggestedOutfits([]);
  };

  // Save the current conversation explicitly
  const saveConversation = () => {
    if (messages.length <= 1) return; // Don't save empty conversations
    
    const conversation = {
      id: Date.now().toString(),
      title: messages.find(m => m.role === 'user')?.content.substring(0, 30) + '...' || 'Style Chat',
      messages: [...messages],
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => {
      const updated = [conversation, ...prev.filter(c => c.id !== conversation.id)].slice(0, 10);
      localStorage.setItem('style-chat-history', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle saving a suggested outfit
  const handleSaveOutfit = (outfit) => {
    if (onSaveOutfit) {
      onSaveOutfit(outfit);
      
      // Add confirmation message
      setMessages(prev => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `I've saved "${outfit.name}" to your collection!`,
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Remove from suggestions
      setSuggestedOutfits(prev => prev.filter(o => o.id !== outfit.id));
    }
  };

  // Render clothing items for an outfit
  const renderOutfitItems = (outfit) => {
    if (!outfit.items || !clothingItems) return null;
    
    // Find the actual clothing items based on IDs
    const outfitItems = outfit.items
      .map(itemId => clothingItems.find(item => item.id === itemId))
      .filter(Boolean);
      
    if (outfitItems.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {outfitItems.map(item => (
          <div key={item.id} className="relative w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
            <Image
              src={item.image || item.thumbnail}
              alt={item.description || 'Outfit item'}
              className="object-contain"
              fill
              sizes="48px"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[600px] overflow-hidden transition-all duration-300">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white mr-3">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Style Assistant Chat</h3>
          {mood && (
            <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">
              {mood.charAt(0).toUpperCase() + mood.slice(1)} Mood
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleNewChat}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="New Chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button 
            onClick={saveConversation}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Save Conversation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                message.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : message.role === 'system'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{processMessageContent(message.content)}</p>
              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {/* Suggested outfits section */}
        {suggestedOutfits.length > 0 && (
          <div className="flex justify-start w-full">
            <div className="rounded-lg px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-gray-800 dark:text-gray-200 w-full">
              <p className="font-medium text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                I found {suggestedOutfits.length} {suggestedOutfits.length === 1 ? 'outfit' : 'outfits'} for &quot;{input.trim() || messages[messages.length-2]?.content || 'your request'}&quot;:
              </p>
              <div className="space-y-3">
                {suggestedOutfits.map(outfit => (
                  <div key={outfit.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{outfit.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{outfit.occasion}</p>
                      </div>
                      <button
                        onClick={() => handleSaveOutfit(outfit)}
                        className="ml-2 p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"
                        title="Save to Collection"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                      {processMessageContent(outfit.description)}
                    </p>
                    {outfit.styling_tips && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 italic">
                        Tip: {processMessageContent(outfit.styling_tips)}
                      </p>
                    )}
                    {renderOutfitItems(outfit)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about styles, occasions, or describe what you're looking for..."
            className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 disabled:hover:text-gray-400 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          Try: &quot;I need a business casual outfit&quot; or &quot;What should I wear for a summer wedding?&quot;
        </div>
      </form>

      {/* Chat history sidebar (can be toggled) */}
      {chatHistory.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-2">
          <div className="flex justify-between items-center px-2 mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Recent Conversations</span>
          </div>
          <div className="flex overflow-x-auto space-x-2 pb-2">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadConversation(chat)}
                className="flex-none px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 whitespace-nowrap"
              >
                {chat.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}