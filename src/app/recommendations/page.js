import OutfitRecommendations from '@/components/Recommendations/OutfitRecommendations';

export const metadata = {
  title: 'Outfit Recommendations | Vestire',
  description: 'Get AI-powered outfit suggestions personalized for your wardrobe and style preferences',
};

export default function RecommendationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <div className="flex items-center mb-3">
          <div className="h-8 w-1.5 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Style Recommendations</h1>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
          Let our AI style assistant create personalized outfit combinations from your wardrobe. Tell us your mood and we will suggest outfits perfect for the occasion.
        </p>
      </div>
      
      <OutfitRecommendations />
      
      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <span className="text-xl font-bold">1</span>
            </div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Select your mood</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose from casual, formal, business, or other moods to match your day&apos;s vibe</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <span className="text-xl font-bold">2</span>
            </div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">AI generates outfits</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Our algorithm analyzes your closet to create stylish combinations that work together</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <span className="text-xl font-bold">3</span>
            </div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Save your favorites</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Swipe right on outfits you love to save them to your collection for easy access</p>
          </div>
        </div>
      </div>
    </div>
  );
}