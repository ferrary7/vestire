'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * SwipeCard component based on https://github.com/rogue-kitten/swipe-cards
 * 
 * A card component that can be swiped left or right with touch or mouse gestures
 * and provides callbacks for swipe actions.
 */
export default function SwipeCard({ 
  children, 
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100, // minimum swipe distance to trigger action
  rotationFactor = 15,  // degree of rotation during swipe
  className = "",
  ...props 
}) {
  const [swipeAnimation, setSwipeAnimation] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const cardRef = useRef(null);
  
  // Handle animation end
  useEffect(() => {
    const handleAnimationEnd = () => {
      if (swipeAnimation) {
        if (swipeAnimation === 'swipe-left') {
          onSwipeLeft && onSwipeLeft();
        } else if (swipeAnimation === 'swipe-right') {
          onSwipeRight && onSwipeRight();
        }
        // Reset after animation is completed
        setTimeout(() => {
          setSwipeAnimation(null);
          setOffsetX(0);
        }, 50);
      }
    };
    
    const cardElement = cardRef.current;
    if (cardElement) {
      cardElement.addEventListener('animationend', handleAnimationEnd);
      return () => cardElement.removeEventListener('animationend', handleAnimationEnd);
    }
  }, [swipeAnimation, onSwipeLeft, onSwipeRight]);
  
  // Calculate the rotation based on swipe distance
  const getRotation = () => {
    return (offsetX / 100) * rotationFactor;
  };
  
  // Swipe handlers
  const handlePointerDown = (e) => {
    if (swipeAnimation) return;
    setIsDragging(true);
    setStartX(e.clientX);
  };
  
  const handlePointerMove = (e) => {
    if (!isDragging || swipeAnimation) return;
    const currentX = e.clientX;
    const newOffsetX = currentX - startX;
    setOffsetX(newOffsetX);
  };
  
  const handlePointerUp = () => {
    if (!isDragging || swipeAnimation) return;
    
    if (Math.abs(offsetX) >= swipeThreshold) {
      if (offsetX > 0) {
        setSwipeAnimation('swipe-right');
      } else {
        setSwipeAnimation('swipe-left');
      }
    } else {
      // Reset if swipe wasn't strong enough
      setOffsetX(0);
    }
    
    setIsDragging(false);
  };
  
  // Handle touch events 
  const handleTouchStart = (e) => {
    if (swipeAnimation) return;
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging || swipeAnimation) return;
    const currentX = e.touches[0].clientX;
    const newOffsetX = currentX - startX;
    setOffsetX(newOffsetX);
    
    // Prevent default to avoid scrolling while swiping
    if (Math.abs(newOffsetX) > 10) {
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = () => {
    if (!isDragging || swipeAnimation) return;
    
    if (Math.abs(offsetX) >= swipeThreshold) {
      if (offsetX > 0) {
        setSwipeAnimation('swipe-right');
      } else {
        setSwipeAnimation('swipe-left');
      }
    } else {
      // Reset if swipe wasn't strong enough
      setOffsetX(0);
    }
    
    setIsDragging(false);
  };
  
  // Determine card style based on swipe state
  const getCardStyle = () => {
    if (swipeAnimation) {
      return {};
    }
    
    return {
      transform: `translateX(${offsetX}px) rotate(${getRotation()}deg)`,
      transition: isDragging ? 'none' : 'transform 0.3s ease',
    };
  };
  
  // Determine swipe indicator opacity based on swipe distance
  const getLeftIndicatorOpacity = () => {
    if (offsetX < 0) {
      return Math.min(Math.abs(offsetX) / swipeThreshold, 1);
    }
    return 0;
  };
  
  const getRightIndicatorOpacity = () => {
    if (offsetX > 0) {
      return Math.min(offsetX / swipeThreshold, 1);
    }
    return 0;
  };
  
  // Animation classes
  const animationClass = swipeAnimation ? (
    swipeAnimation === 'swipe-left' 
      ? 'animate-swipe-left' 
      : 'animate-swipe-right'
  ) : '';
  
  return (
    <div 
      ref={cardRef}
      className={`relative select-none touch-none ${className} ${animationClass}`}
      style={getCardStyle()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {/* Left swipe indicator */}
      <div 
        className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800/30 z-10 pointer-events-none"
        style={{ opacity: getLeftIndicatorOpacity() }}
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      
      {/* Right swipe indicator */}
      <div 
        className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400 border border-green-100 dark:border-green-800/30 z-10 pointer-events-none"
        style={{ opacity: getRightIndicatorOpacity() }}
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      
      {children}
    </div>
  );
}