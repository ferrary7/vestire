# Vestire - Digital Closet Application

Vestire is a comprehensive digital closet application that allows you to organize your wardrobe, create outfits, and receive AI-powered style recommendations.

## Features

### Clothing Management
- Image upload with automatic background removal
- Category, color, and season tagging
- Interactive catalog with filtering and search capabilities

### Outfit Creation
- Drag-and-drop canvas for combining clothing items
- Save and organize outfit combinations
- Track relationships between clothing items and outfits

### AI-Powered Recommendations
- Get outfit suggestions based on your mood
- Swipe interface for browsing recommendations
- Save favorite recommendations to your outfit collection

## Technologies Used

- **Framework**: Next.js 15 with App Router
- **State Management**: Zustand with localStorage persistence
- **Styling**: Tailwind CSS
- **AI Services**:
  - Replicate API for background removal (rembg model)
  - Anthropic Claude API for outfit recommendations
- **Interactions**:
  - React DnD for drag-and-drop functionality
  - React Swipeable for gesture-based interactions

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- API keys for:
  - [Replicate](https://replicate.com/) - For background removal
  - [Anthropic Claude](https://www.anthropic.com/) - For AI outfit recommendations

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vestire.git
cd vestire
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with your API keys:
```
REPLICATE_API_KEY=your-replicate-api-key
CLAUDE_API_KEY=your-claude-api-key
NEXT_PUBLIC_APP_NAME=Vestire - Digital Closet
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Adding Clothing Items
1. Navigate to the "Add Item" page
2. Upload an image from your device
3. Fill in the details (category, description, color, season)
4. Click "Add to Closet" to save the item

### Creating Outfits
1. Go to the "Outfits" page
2. Name your outfit and add a description
3. Drag clothing items from the palette to the canvas
4. Position items as desired
5. Click "Save Outfit" to add it to your collection

### Getting Recommendations
1. Visit the "Recommendations" page
2. Choose your current mood from the dropdown
3. Click "Generate Outfit Ideas"
4. Swipe right to save outfits you like, left to skip

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/             # API routes for backend functionality
│   ├── add/             # Add clothing item page
│   ├── outfits/         # Outfit creation and management page
│   └── recommendations/ # AI recommendations page
├── components/          # React components
│   ├── Clothing/        # Clothing-related components
│   ├── Outfits/         # Outfit-related components
│   ├── Recommendations/ # Recommendation-related components
│   └── UI/              # Shared UI components
├── lib/                 # Utility functions and shared logic
│   ├── store/           # Zustand store
│   └── utils/           # Helper functions
└── styles/              # CSS styles
```

## API Documentation

### `/api/rembg`
Removes the background from clothing images using Replicate's rembg model.

**Request:**
- `POST /api/rembg`
- Body: `{ image: "base64-encoded-image-data" }`

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://replicate.delivery/pbxt/12345..."
}
```

### `/api/recommendations`
Generates outfit recommendations based on existing clothing items.

**Request:**
- `POST /api/recommendations`
- Body: `{ items: [...clothingItems], mood: "casual" }`

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "name": "Weekend Casual",
      "items": ["item-id-1", "item-id-2"],
      "description": "A comfortable outfit perfect for weekends",
      "occasion": "Casual outings"
    },
    ...
  ]
}
```

## License

MIT

## Acknowledgements

- [Replicate](https://replicate.com/) for the background removal API
- [Anthropic](https://www.anthropic.com/) for the Claude AI API
- [Next.js](https://nextjs.org/) for the framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
