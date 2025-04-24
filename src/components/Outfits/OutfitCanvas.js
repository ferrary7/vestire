'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import Image from 'next/image';
import useClosetStore from '@/lib/store/closetStore';

/**
 * Draggable clothing item component
 */
const DraggableItem = ({ item, onDragStart }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'clothing-item',
    item: () => item,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag}
      className={`relative w-20 h-20 cursor-grab active:cursor-grabbing bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md m-1.5 ${isDragging ? 'opacity-50 scale-105' : ''}`}
      onTouchStart={() => onDragStart(item)}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-30"></div>
      <Image
        src={item.image || item.thumbnail}
        alt={item.description || item.category}
        className="object-contain"
        fill
        sizes="80px"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-center text-xs py-1 font-medium">
        {item.category}
      </div>
    </div>
  );
};

/**
 * Canvas item component (items placed on the canvas)
 */
const CanvasItem = ({ item, position, onMove, onRemove }) => {
  const elementRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pos, setPos] = useState(position);

  // Update position if it changes externally
  useEffect(() => {
    setPos(position);
  }, [position]);

  // Handle drag start
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Support both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }
  };

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    
    // Support both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    if (!clientX || !clientY) return;
    
    const canvasRect = document.getElementById('outfit-canvas').getBoundingClientRect();
    const newX = Math.max(0, Math.min(clientX - canvasRect.left - dragOffset.x, canvasRect.width - 100));
    const newY = Math.max(0, Math.min(clientY - canvasRect.top - dragOffset.y, canvasRect.height - 100));
    
    setPos({ x: newX, y: newY });
    onMove(item.id, { x: newX, y: newY });
  }, [isDragging, dragOffset, item.id, onMove]);

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Add event listeners for mouse/touch events
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => handleDragMove(e);
      const handleTouchMove = (e) => handleDragMove(e);
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove]);

  return (
    <div
      ref={elementRef}
      className={`absolute w-28 h-28 ${isDragging ? 'z-10' : 'z-1'} transition-transform duration-200 ${isDragging ? 'scale-105' : ''}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      <div className="relative w-full h-full group">
        <div className="absolute inset-0 rounded-lg shadow-md bg-white dark:bg-gray-800 overflow-hidden">
          <Image
            src={item.image || item.thumbnail}
            alt={item.description || item.category}
            className="object-contain"
            fill
            sizes="112px"
            draggable={false}
          />
        </div>
        
        <button
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md transform transition-transform opacity-90 hover:opacity-100 hover:scale-110"
          onClick={() => onRemove(item.id)}
        >
          ×
        </button>
        
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-center text-xs py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {item.category}
        </div>
      </div>
    </div>
  );
};

/**
 * Main outfit canvas component
 */
export default function OutfitCanvas() {
  const { clothingItems } = useClosetStore();
  const [canvasItems, setCanvasItems] = useState([]);
  const [outfitName, setOutfitName] = useState('');
  const [outfitDescription, setOutfitDescription] = useState('');
  const [filter, setFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { addOutfit } = useClosetStore();
  const canvasRef = useRef(null);
  const isTouchDevice = useRef(false);
  
  // Check if this is a touch device on component mount
  useEffect(() => {
    isTouchDevice.current = ('ontouchstart' in window) || 
      (navigator.maxTouchPoints > 0) || 
      (navigator.msMaxTouchPoints > 0);
  }, []);
  
  // Handle drop on canvas
  const [, drop] = useDrop(() => ({
    accept: 'clothing-item',
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !canvasRef.current) return;
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate position within canvas
      const x = offset.x - canvasRect.left - 50; // Center the item
      const y = offset.y - canvasRect.top - 50;
      
      addItemToCanvas(item, { x, y });
    },
  }));
  
  // Add item to canvas from the palette (touch devices)
  const addItemToCanvas = (item, position = { x: 50, y: 50 }) => {
    // Check if the item is already on the canvas
    if (canvasItems.find(i => i.id === item.id)) {
      return;
    }
    
    setCanvasItems(prev => [...prev, { ...item, position }]);
  };
  
  // Update item position on canvas
  const updateItemPosition = (itemId, position) => {
    setCanvasItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, position } 
          : item
      )
    );
  };
  
  // Remove item from canvas
  const removeFromCanvas = (itemId) => {
    setCanvasItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  // Save outfit
  const handleSaveOutfit = () => {
    if (canvasItems.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Add at least one item to your outfit'
      });
      return;
    }
    
    if (!outfitName) {
      setFeedback({
        type: 'error',
        message: 'Please give your outfit a name'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      addOutfit({
        name: outfitName,
        description: outfitDescription,
        items: canvasItems.map(item => item.id),
        layout: canvasItems.map(item => ({
          id: item.id,
          position: item.position
        }))
      });
      
      // Reset form
      setOutfitName('');
      setOutfitDescription('');
      setCanvasItems([]);
      
      setFeedback({
        type: 'success',
        message: 'Outfit saved successfully!'
      });
      
      // Clear feedback after a delay
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to save outfit'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Filter clothing items
  const filteredItems = clothingItems.filter(item => {
    if (!filter) return true;
    return item.category === filter;
  });

  // Get available categories
  const categories = [...new Set(clothingItems.map(item => item.category))].filter(Boolean);

  return (
    <div className="p-6 space-y-8">
      {/* Outfit details form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="outfit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Outfit Name
            </label>
            <input
              id="outfit-name"
              type="text"
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-200"
              placeholder="Summer casual"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="outfit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <input
              id="outfit-description"
              type="text"
              value={outfitDescription}
              onChange={(e) => setOutfitDescription(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-4 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-200"
              placeholder="Perfect for sunny weekends"
            />
          </div>
        </div>
      </div>
      
      {/* Canvas area */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div
          id="outfit-canvas"
          ref={(el) => {
            canvasRef.current = el;
            drop(el);
          }}
          className="relative w-full h-96 sm:h-[28rem] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 overflow-hidden"
        >
          {canvasItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4">
              <div className="max-w-md mx-auto">
                <div className="mb-4 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-300 dark:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Create Your Look</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Drag items from the palette below or tap to add them to your outfit canvas
                </p>
              </div>
            </div>
          )}
          
          {canvasItems.map((item) => (
            <CanvasItem
              key={item.id}
              item={item}
              position={item.position}
              onMove={updateItemPosition}
              onRemove={removeFromCanvas}
            />
          ))}
        </div>
      </div>
      
      {/* Item palette */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by category
            </label>
            <span className="text-xs text-gray-500">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filter === '' 
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filter === category 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
          {filteredItems.length > 0 ? (
            <div className="flex flex-wrap">
              {filteredItems.map((item) => (
                <DraggableItem
                  key={item.id}
                  item={item}
                  onDragStart={isTouchDevice.current ? addItemToCanvas : () => {}}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {clothingItems.length === 0
                ? 'Add some clothing items to your closet first'
                : 'No items match the selected filter'}
            </div>
          )}
        </div>
      </div>
      
      {/* Save button and feedback message */}
      <div className="flex flex-col sm:flex-row-reverse items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
        <button
          onClick={handleSaveOutfit}
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-purple-600"
        >
          {isSaving ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            'Save Outfit'
          )}
        </button>
        
        {feedback && (
          <div className={`px-5 py-3 rounded-lg text-white font-medium transition-all duration-300 ${
            feedback.type === 'error' 
              ? 'bg-red-500' 
              : 'bg-green-500'
          }`}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}