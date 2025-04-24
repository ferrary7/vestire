import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Main store for managing clothing items and outfits
 * Uses Zustand's persist middleware to save data to localStorage
 * Syncs with MongoDB via API calls for authenticated users
 */
const useClosetStore = create(
  persist(
    (set, get) => ({
      // Clothing items collection
      clothingItems: [],
      // Outfits collection (combinations of clothing items)
      outfits: [],
      // Currently selected mood for recommendations
      currentMood: 'casual',
      // Loading states for API operations
      isLoading: {
        upload: false,
        recommendation: false,
        fetch: false,
        sync: false,
      },
      // Recommendation history
      recommendations: [],
      // User authentication status
      user: null,
      
      // Set user data from session
      setUser: (user) => {
        if (user) {
          set({ user });
        } else {
          // Clear user data when logging out
          set({ 
            user: null,
            clothingItems: [],
            outfits: [],
            recommendations: []
          });
        }
      },
      
      // Initialize data from MongoDB when user logs in
      initializeUserData: async () => {
        const user = get().user;
        if (!user) return;
        
        set(state => ({ isLoading: { ...state.isLoading, fetch: true } }));
        
        try {
          // Fetch clothing items and outfits from MongoDB
          const [clothingRes, outfitsRes] = await Promise.all([
            fetch('/api/clothing'),
            fetch('/api/outfits'),
          ]);
          
          if (clothingRes.ok && outfitsRes.ok) {
            const [clothingItems, outfits] = await Promise.all([
              clothingRes.json(),
              outfitsRes.json(),
            ]);
            
            set({
              clothingItems,
              outfits,
            });
          } else {
            console.error('Failed to fetch user data');
          }
        } catch (error) {
          console.error('Error initializing user data:', error);
        } finally {
          set(state => ({ isLoading: { ...state.isLoading, fetch: false } }));
        }
      },
      
      // Clear all user data (used when logging out)
      clearUserData: () => {
        set({
          clothingItems: [],
          outfits: [],
          recommendations: [],
          user: null
        });
      },
      
      // Actions for clothing items
      addClothingItem: async (item) => {
        // Add to local state immediately for responsiveness
        const newItem = { ...item, id: Date.now().toString() };
        set(state => ({ clothingItems: [...state.clothingItems, newItem] }));
        
        // If user is authenticated, sync with database
        const user = get().user;
        if (user) {
          try {
            set(state => ({ isLoading: { ...state.isLoading, sync: true } }));
            const response = await fetch('/api/clothing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            
            if (response.ok) {
              // Replace temporary item with the one from DB that has MongoDB ID
              const savedItem = await response.json();
              set(state => ({
                clothingItems: state.clothingItems.map(i => 
                  i.id === newItem.id ? savedItem : i
                )
              }));
            }
          } catch (error) {
            console.error('Error saving clothing item to DB:', error);
          } finally {
            set(state => ({ isLoading: { ...state.isLoading, sync: false } }));
          }
        }
      },
      
      removeClothingItem: async (id) => {
        // Remove from local state
        set((state) => ({ 
          clothingItems: state.clothingItems.filter(item => item.id !== id) 
        }));
        
        // If user is authenticated, sync with database
        const user = get().user;
        if (user) {
          try {
            const response = await fetch(`/api/clothing?id=${id}`, {
              method: 'DELETE',
            });
            
            if (!response.ok) {
              console.error('Error deleting clothing item from database');
            }
          } catch (error) {
            console.error('Error deleting clothing item:', error);
          }
        }
      },
      
      updateClothingItem: (id, updates) => set((state) => ({
        clothingItems: state.clothingItems.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
      })),
      
      // Actions for outfits
      addOutfit: async (outfit) => {
        // Add to local state immediately
        const newOutfit = { 
          ...outfit, 
          id: Date.now().toString(),
          createdAt: new Date().toISOString() 
        };
        
        set(state => ({ outfits: [...state.outfits, newOutfit] }));
        
        // If user is authenticated, sync with database
        const user = get().user;
        if (user) {
          try {
            set(state => ({ isLoading: { ...state.isLoading, sync: true } }));
            const response = await fetch('/api/outfits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(outfit),
            });
            
            if (response.ok) {
              // Replace temporary outfit with the one from DB
              const savedOutfit = await response.json();
              set(state => ({
                outfits: state.outfits.map(o => 
                  o.id === newOutfit.id ? savedOutfit : o
                )
              }));
            }
          } catch (error) {
            console.error('Error saving outfit to DB:', error);
          } finally {
            set(state => ({ isLoading: { ...state.isLoading, sync: false } }));
          }
        }
      },
      
      removeOutfit: async (id) => {
        // Remove from local state
        set((state) => ({ 
          outfits: state.outfits.filter(outfit => outfit.id !== id) 
        }));
        
        // If user is authenticated, sync with database
        const user = get().user;
        if (user) {
          try {
            set(state => ({ isLoading: { ...state.isLoading, sync: true } }));
            const response = await fetch(`/api/outfits?id=${id}`, {
              method: 'DELETE',
            });
            
            if (!response.ok) {
              console.error('Error deleting outfit from database');
            }
          } catch (error) {
            console.error('Error deleting outfit:', error);
          } finally {
            set(state => ({ isLoading: { ...state.isLoading, sync: false } }));
          }
        }
      },
      
      updateOutfit: (id, updates) => set((state) => ({
        outfits: state.outfits.map(outfit => 
          outfit.id === id ? { ...outfit, ...updates } : outfit
        )
      })),
      
      // Actions for recommendations
      setCurrentMood: (mood) => set({ currentMood: mood }),
      
      addRecommendation: (recommendation) => set((state) => ({
        recommendations: [...state.recommendations, {
          ...recommendation,
          id: Date.now().toString(),
          timestamp: new Date().toISOString()
        }]
      })),
      
      // Loading state actions
      setLoading: (operation, isLoading) => set((state) => ({
        isLoading: { ...state.isLoading, [operation]: isLoading }
      })),
    }),
    {
      name: 'vestire-closet-storage', // Name for the localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useClosetStore;