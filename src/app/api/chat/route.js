import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import * as mongoDBService from '@/lib/services/mongoDBService';

// Style categories with associated keywords
const STYLE_CATEGORIES = {
  'provocative': ['sexy', 'hot', 'revealing', 'slutty', 'seductive', 'sensual', 'provocative', 'daring', 'bold', 'alluring'],
  'formal': ['elegant', 'sophisticated', 'classy', 'fancy', 'formal', 'refined', 'polished', 'black tie', 'gala'],
  'casual': ['relaxed', 'everyday', 'comfortable', 'chill', 'laid back', 'informal', 'easy-going', 'simple'],
  'athletic': ['sporty', 'active', 'workout', 'gym', 'athletic', 'fitness', 'training', 'running', 'exercise'],
  'business': ['professional', 'office', 'work', 'corporate', 'business', 'career', 'interview', 'meeting'],
  'nightout': ['party', 'club', 'going out', 'night', 'dance', 'bar', 'date night', 'evening', 'cocktail'],
};

// Occasions with associated clothing items
const OCCASION_OUTFITS = {
  'date': ['dress', 'skirt', 'blouse', 'heels', 'jeans', 'nice top', 'blazer', 'button up shirt', 'bodycon'],
  'club': ['mini dress', 'bodycon', 'crop top', 'tight jeans', 'sequins', 'leather pants', 'bodysuit', 'heels'],
  'beach': ['swimsuit', 'bikini', 'swim trunks', 'cover up', 'sandals', 'shorts', 'tank top', 'sun hat'],
  'wedding': ['suit', 'tie', 'dress', 'formal wear', 'heels', 'oxfords', 'gown', 'blazer'],
  'interview': ['suit', 'blazer', 'dress shirt', 'slacks', 'pencil skirt', 'blouse', 'tie', 'loafers'],
};

/**
 * Detect style intent from a user message
 */
function detectStyleIntent(message) {
  const lowercaseMessage = message.toLowerCase();
  let detectedCategory = null;
  let matchedKeywords = [];
  let occasionMatches = [];
  
  // Check for style category matches
  for (const [category, keywords] of Object.entries(STYLE_CATEGORIES)) {
    for (const keyword of keywords) {
      if (lowercaseMessage.includes(keyword)) {
        detectedCategory = category;
        matchedKeywords.push(keyword);
      }
    }
  }
  
  // Check for occasion matches
  for (const occasion of Object.keys(OCCASION_OUTFITS)) {
    if (lowercaseMessage.includes(occasion)) {
      occasionMatches.push(occasion);
    }
  }
  
  return {
    detectedCategory,
    matchedKeywords,
    occasionMatches,
    isRequestingAnother: lowercaseMessage.includes('another') || 
                         lowercaseMessage.includes('one more') || 
                         lowercaseMessage.includes('different')
  };
}

/**
 * POST /api/chat
 * Handle chat messages with the AI style assistant
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = null;
    
    if (session && session.user) {
      userId = session.user.id;
    }
    
    const { message, mood, history } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Get user's clothing items if they are authenticated
    let userClothingItems = [];
    let userOutfits = [];
    
    if (userId) {
      userClothingItems = await mongoDBService.getUserClothingItems(userId);
      userOutfits = await mongoDBService.getUserOutfits(userId);
    }
    
    // Detect style intent from the message
    const styleIntent = detectStyleIntent(message);
    
    // Format clothing items to be more readable for the AI
    const formattedClothingItems = userClothingItems.map(item => 
      `${item.description || 'Item'} (${item.category || 'Unknown category'}, ${item.color || 'Unknown color'})`
    ).join(', ');
    
    // Construct a system prompt that includes the user's clothing information
    const systemPrompt = `You are Vestire's AI fashion and style assistant. You provide helpful, friendly advice about fashion, clothing combinations, style tips, and personalized recommendations. Be conversational, supportive, and give concrete examples.
    
${userId && userClothingItems.length > 0 
  ? `The user has the following items in their closet: ${formattedClothingItems}.`
  : 'The user has not added any clothing items to their closet yet.'}

${userId && userOutfits.length > 0
  ? `The user has saved ${userOutfits.length} outfit(s) to their collection.`
  : ''}

${mood 
  ? `The user has selected "${mood}" as their current mood. Tailor your recommendations and advice to match this mood.` 
  : ''}

${styleIntent.detectedCategory
  ? `The user seems to be interested in a ${styleIntent.detectedCategory} style. Be sure to provide specific recommendations that align with this style preference.`
  : ''}

Style Guidance:
- If asked about "sexy" or "provocative" outfits, suggest tasteful options like well-fitted clothing, strategic cut-outs, or appropriate skin-showing based on the occasion.
- For professional settings, recommend business-appropriate attire while still maintaining personal style.
- When suggesting outfits, be specific with combinations rather than generic advice.
- If the user asks for "another" suggestion, provide a new and different outfit recommendation than previously given.

If you're not sure about something, be honest and suggest alternatives or general guidelines.`;

    // Format chat history for the AI
    const formattedHistory = [
      { role: 'system', content: systemPrompt },
      ...history.filter(msg => msg.role !== 'system') // Filter out any system messages from the client
    ];
    
    // Process the message to generate an AI response
    // In a production environment, this would call an actual LLM API
    // For demonstration purposes, we'll simulate a response
    const aiResponse = await generateAIResponse(message, formattedHistory, mood, styleIntent);
    
    // If user is authenticated, save the chat interaction to MongoDB
    if (userId) {
      try {
        await mongoDBService.saveChatInteraction(userId, {
          message,
          response: aiResponse,
          mood,
          styleIntent: styleIntent.detectedCategory,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error saving chat interaction:', error);
        // Continue anyway, this shouldn't block the response
      }
    }
    
    return NextResponse.json({ message: aiResponse });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

/**
 * Generate AI response based on the message, history, and selected mood
 * In a production environment, this would call an actual LLM API
 */
async function generateAIResponse(message, history, mood, styleIntent) {
  // This is a placeholder. In a real implementation, you would call a language model API
  
  const lowercaseMessage = message.toLowerCase();
  const isRequestingAnother = styleIntent.isRequestingAnother;
  
  // Check for previous suggestions in history to avoid repetition
  const previousSuggestions = [];
  if (isRequestingAnother && history.length > 2) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') {
        previousSuggestions.push(history[i].content);
        if (previousSuggestions.length >= 2) break;
      }
    }
  }
  
  // Generate response based on style intent
  if (styleIntent.detectedCategory === 'provocative') {
    return generateProvocativeOutfitResponse(mood, previousSuggestions);
  } else if (styleIntent.detectedCategory === 'formal') {
    return generateFormalOutfitResponse(mood, previousSuggestions);
  } else if (styleIntent.detectedCategory === 'casual') {
    return generateCasualOutfitResponse(mood, previousSuggestions);
  } else if (styleIntent.detectedCategory === 'business') {
    return generateBusinessOutfitResponse(mood, previousSuggestions);
  } else if (styleIntent.detectedCategory === 'athletic') {
    return generateAthleticOutfitResponse(mood, previousSuggestions);
  } else if (styleIntent.detectedCategory === 'nightout') {
    return generateNightOutOutfitResponse(mood, previousSuggestions);
  } else if (styleIntent.occasionMatches.length > 0) {
    return generateOccasionBasedResponse(styleIntent.occasionMatches[0], mood, previousSuggestions);
  } else if (lowercaseMessage.includes('recommend') || lowercaseMessage.includes('suggest') || lowercaseMessage.includes('what should i wear')) {
    return generateGeneralRecommendation(mood, previousSuggestions);
  } else if (lowercaseMessage.includes('trend') || lowercaseMessage.includes('fashion') || lowercaseMessage.includes('style')) {
    return "Current fashion trends include oversized blazers, wide-leg pants, and statement collars. Sustainability is also becoming increasingly important, with more people investing in quality pieces that last longer rather than fast fashion. Remember though, the best style is one that makes you feel confident and comfortable. It's perfectly fine to appreciate trends from afar and stick with what works for your personal style!";
  } else if (lowercaseMessage.includes('color') || lowercaseMessage.includes('match') || lowercaseMessage.includes('combination')) {
    return "When combining colors, a good rule of thumb is to use the color wheel: complementary colors (opposite on the wheel) create bold looks, while analogous colors (next to each other) create harmonious ones. Neutrals like black, white, navy, and beige pair well with almost everything. If you're unsure, the monochromatic approach (different shades of the same color) is always elegant. What specific color combinations are you interested in?";
  } else {
    return "I'd be happy to help with your style questions! Whether you're looking for outfit ideas, style advice, or recommendations for specific occasions, I can assist you. Feel free to ask about casual wear, professional attire, evening looks, or even more daring and provocative styles. What kind of outfit are you interested in today?";
  }
}

/**
 * Generate provocative outfit response
 */
function generateProvocativeOutfitResponse(mood, previousSuggestions) {
  // Array of possible provocative but tasteful outfit suggestions
  const suggestions = [
    "For a seductive yet tasteful look, try a fitted black bodycon dress that accentuates your figure, paired with strappy heels and minimal jewelry. This creates an elegant silhouette while still being alluring.",
    
    "A stylish yet provocative outfit could be high-waisted leather pants paired with a silk camisole or a slightly sheer blouse. Add a fitted blazer that you can remove in the right setting, and finish with heeled boots.",
    
    "For a bold going-out look, consider a mini skirt paired with an off-shoulder or one-shoulder top. This shows just enough skin to be eye-catching while maintaining an air of sophistication.",
    
    "A daring yet classy outfit would be a jumpsuit with strategic cutouts or a low back. This creates intrigue while still being put-together and appropriate for many settings.",
    
    "For a subtly provocative look, try skinny jeans with a bodysuit that has a plunging neckline, topped with a lightweight cardigan or jacket that you can style open or closed depending on how much you want to reveal.",
    
    "A slip dress in a luxurious fabric like silk or satin creates a sensual look that's still elegant. Layer with a thin jacket if you want the option of more coverage.",
    
    "For a bold summer outfit, pair high-waisted shorts with a crop top that shows just a hint of midriff. This is playful and flirty without being too revealing."
  ];
  
  // Filter out any suggestions that were recently given
  const availableSuggestions = suggestions.filter(suggestion => 
    !previousSuggestions.some(prev => prev.includes(suggestion))
  );
  
  // Return a random suggestion from available ones, or the default if none are available
  if (availableSuggestions.length > 0) {
    return availableSuggestions[Math.floor(Math.random() * availableSuggestions.length)];
  } else {
    return "For a seductive yet tasteful outfit, I'd recommend balancing more revealing pieces with more modest ones. For example, if you wear a low-cut top, pair it with longer pants or a skirt. Or if you choose a mini skirt, balance it with a less revealing top. This creates an intriguing look that leaves something to the imagination while still making you feel confident and attractive.";
  }
}

/**
 * Generate formal outfit response
 */
function generateFormalOutfitResponse(mood, previousSuggestions) {
  // Array of possible formal outfit suggestions
  const suggestions = [
    "For a formal occasion, a classic black suit with a crisp white shirt and a silk tie never fails. Add a pocket square for a touch of personality and polish off the look with well-shined oxfords.",
    
    "A tailored tuxedo in midnight blue provides an elegant alternative to traditional black for formal events. Pair with patent leather shoes and subtle accessories for a sophisticated look.",
    
    "For formal events, consider a floor-length gown in a jewel tone like emerald or sapphire. The rich color makes a statement while maintaining elegance, and you can accessorize with metallic accents.",
    
    "A sophisticated formal outfit could be a tailored jumpsuit in a luxurious fabric like crepe or velvet. This modern alternative to a dress is both comfortable and striking, especially when accessorized with statement jewelry and heels."
  ];
  
  // Filter out any suggestions that were recently given
  const availableSuggestions = suggestions.filter(suggestion => 
    !previousSuggestions.some(prev => prev.includes(suggestion))
  );
  
  // Return a random suggestion from available ones, or the default if none are available
  if (availableSuggestions.length > 0) {
    return availableSuggestions[Math.floor(Math.random() * availableSuggestions.length)];
  } else {
    return "For a formal occasion, I recommend a well-tailored outfit that fits you perfectly. For men, a classic suit in navy or charcoal gray with a coordinating tie and pocket square creates a timeless look. For women, an elegant dress in a sophisticated color or a tailored suit makes a confident statement. The key to formal wear is in the details - quality fabrics, perfect fit, and subtle accessories elevate the entire look.";
  }
}

/**
 * Generate casual outfit response
 */
function generateCasualOutfitResponse(mood, previousSuggestions) {
  // Array of possible casual outfit suggestions
  const suggestions = [
    "For a relaxed casual look, pair well-fitted jeans with a soft t-shirt and layer with an open button-up shirt or light jacket. Finish with clean sneakers or casual boots for an effortless style that's comfortable but put-together.",
    
    "A casual weekend outfit could be chinos in a versatile color like tan or olive, paired with a Henley or polo shirt. This elevates your look beyond basic jeans and a t-shirt while still keeping it comfortable and appropriate for many settings.",
    
    "For a casual summer outfit, try linen shorts paired with a short-sleeve button-up in a fun print or solid color. This combination keeps you cool while looking more polished than basic shorts and a t-shirt."
  ];
  
  // Filter out any suggestions that were recently given
  const availableSuggestions = suggestions.filter(suggestion => 
    !previousSuggestions.some(prev => prev.includes(suggestion))
  );
  
  // Return a random suggestion from available ones, or the default if none are available
  if (availableSuggestions.length > 0) {
    return availableSuggestions[Math.floor(Math.random() * availableSuggestions.length)];
  } else {
    return "For a casual everyday look that still feels put-together, I recommend starting with well-fitted jeans or chinos as your foundation. Add a quality t-shirt, polo, or casual button-down in a color that flatters you. Layer with a light jacket, cardigan, or flannel depending on the weather. Finish with clean, simple sneakers or casual boots. This formula works for most casual settings while still looking intentional and stylish.";
  }
}

/**
 * Generate business outfit response
 */
function generateBusinessOutfitResponse(mood, previousSuggestions) {
  // Array of possible business outfit suggestions
  const suggestions = [
    "For a professional business look, a navy or charcoal suit with a light-colored dress shirt and a tie in a complementary color creates a trustworthy, competent appearance. Make sure everything is well-tailored for a polished finish.",
    
    "A versatile business outfit is a tailored blazer paired with coordinating trousers or a pencil skirt, a crisp button-down shirt, and closed-toe shoes. This look is professional while still allowing for personal style through subtle patterns or accessory choices.",
    
    "For a modern business casual approach, try wool or cotton blend trousers with a tucked-in dress shirt and no tie. Add a quality belt and leather shoes for a complete look that balances professionalism with comfort."
  ];
  
  // Filter out any suggestions that were recently given
  const availableSuggestions = suggestions.filter(suggestion => 
    !previousSuggestions.some(prev => prev.includes(suggestion))
  );
  
  // Return a random suggestion from available ones, or the default if none are available
  if (availableSuggestions.length > 0) {
    return availableSuggestions[Math.floor(Math.random() * availableSuggestions.length)];
  } else {
    return "For a professional business environment, I recommend a well-tailored suit in a classic color like navy, charcoal, or black. Pair with a crisp dress shirt in white or light blue, and add a tie in a complementary color. Make sure your shoes are polished and match your belt. The key to business attire is precise fit and attention to detail - even small elements like quality socks and a good watch can elevate your professional presence.";
  }
}

/**
 * Generate athletic outfit response
 */
function generateAthleticOutfitResponse(mood, previousSuggestions) {
  // Array of possible athletic outfit suggestions
  const suggestions = [
    "For a functional workout outfit, pair moisture-wicking leggings or shorts with a breathable performance t-shirt or tank. Add supportive athletic shoes appropriate for your activity, and consider layers like a lightweight jacket if you'll be outdoors.",
    
    "A stylish gym outfit could be coordinated compression shorts or leggings with a matching or complementary performance top. This looks put-together while providing the technical benefits of athletic wear.",
    
    "For yoga or low-impact exercise, try high-waisted leggings with a cropped or fitted tank that won't ride up during movement. The high waist provides coverage and support during bends and stretches."
  ];
  
  // Filter out any suggestions that were recently given
  const availableSuggestions = suggestions.filter(suggestion => 
    !previousSuggestions.some(prev => prev.includes(suggestion))
  );
  
  // Return a random suggestion from available ones, or the default if none are available
  if (availableSuggestions.length > 0) {
    return availableSuggestions[Math.floor(Math.random() * availableSuggestions.length)];
  } else {
    return "For an athletic outfit that balances performance and style, start with moisture-wicking bottoms - either shorts or leggings depending on your preference and the activity. Pair with a breathable top that allows for full range of motion. Layer with a lightweight performance jacket if needed. Choose footwear specific to your activity for proper support. The key is finding activewear with technical features that keep you comfortable during your workout while still looking good.";
  }
}

/**
 * Generate night out outfit response
 */
function generateNightOutOutfitResponse(mood, previousSuggestions) {
  // Array of possible night out outfit suggestions
  const suggestions = [
    "For a stylish night out, try dark wash jeans paired with a silk or satin top and a tailored blazer. Add heeled boots or dress shoes and some statement jewelry for a look that's elevated but not overdressed.",
    
    "A versatile evening outfit could be black jeans or trousers paired with a bold patterned shirt or a top with interesting details like ruffles or metallic accents. Layer with a leather or suede jacket for added edge.",
    
    "For a dinner date or upscale bar, consider a midi dress with an interesting texture or pattern, paired with ankle boots or heels. Add a clutch and statement earrings to complete the look."
  ];
  
  // Filter out any suggestions that were recently given
  const availableSuggestions = suggestions.filter(suggestion => 
    !previousSuggestions.some(prev => prev.includes(suggestion))
  );
  
  // Return a random suggestion from available ones, or the default if none are available
  if (availableSuggestions.length > 0) {
    return availableSuggestions[Math.floor(Math.random() * availableSuggestions.length)];
  } else {
    return "For a night out, I recommend an outfit with elements that catch the light or add visual interest - think fabrics with slight sheen, strategic sequins, or interesting textures. A simple formula is to pair your favorite well-fitted jeans or trousers with a 'statement' top - something with an interesting neckline, sleeve detail, or eye-catching material. Add a leather jacket or blazer for layering, and finish with footwear that's both stylish and comfortable enough for a full evening out. Remember, confidence is your best accessory!";
  }
}

/**
 * Generate occasion-based response
 */
function generateOccasionBasedResponse(occasion, mood, previousSuggestions) {
  // Implementation for occasion-specific outfit suggestions
  switch (occasion) {
    case 'date':
      return "For a date, consider an outfit that makes you feel confident and comfortable while showing your personal style. A good approach is dark jeans or chinos paired with a well-fitted button-up shirt or an elegant top. Layer with a blazer or leather jacket depending on the venue. This strikes the perfect balance between effort and effortlessness - you want to look like you care without seeming like you tried too hard.";
      
    case 'club':
      return "For a club or night out dancing, opt for an outfit that allows movement while still looking stylish. Consider dark jeans or leather pants paired with a top that has some interesting element - maybe sequins, a unique cut, or a bold color. Wear shoes you can actually walk and dance in comfortably, and consider bringing a small crossbody bag to keep your hands free. The key is finding pieces that look great but don't restrict your ability to enjoy the night.";
      
    case 'beach':
      return "For a beach outfit, light fabrics that dry quickly are key. Beyond your swimwear, pack a cover-up like a flowy dress or loose linen shirt, comfortable sandals, a wide-brimmed hat for sun protection, and sunglasses. Don't forget a beach bag with a change of clothes if you're planning to go elsewhere afterwards. Opt for bright colors or tropical prints to embrace the beach vibe!";
      
    case 'wedding':
      return "For wedding attire, always consider the dress code specified on the invitation. For semi-formal weddings, a suit or dress in a mid-tone color works well. For formal weddings, opt for a dark suit or floor-length dress. Pay attention to the venue too - outdoor garden weddings might call for lighter colors and fabrics, while evening ballroom events suggest more formal choices. When in doubt, it's better to be slightly overdressed than underdressed.";
      
    case 'interview':
      return "For a job interview, your outfit should communicate professionalism and attention to detail. A tailored suit in navy, gray, or black is the safest choice for most industries. Pair with a light-colored, crisply pressed shirt or blouse and conservative accessories. Even for 'casual' workplaces, elevate your usual casual wear - perhaps with pressed chinos instead of jeans, and a blazer over a more casual shirt. First impressions matter, so ensure everything is clean, wrinkle-free, and fits well.";
      
    default:
      return "For any special occasion, consider both the venue and the level of formality when selecting your outfit. As a general rule, it's better to be slightly overdressed than underdressed. Pay attention to details like proper fit, appropriate accessories, and ensuring your clothes are clean and wrinkle-free. Most importantly, wear something that makes you feel confident - when you feel good in your clothes, it shows in your demeanor and presence.";
  }
}

/**
 * Generate general recommendation
 */
function generateGeneralRecommendation(mood, previousSuggestions) {
  if (mood === 'casual') {
    return "For a casual look, I recommend well-fitted jeans paired with a comfortable t-shirt or a light sweater. You could add a denim jacket or a cardigan if it's cooler. Finish with white sneakers or casual boots. Remember, casual doesn't mean sloppy - well-fitting clothes in good condition make all the difference!";
  } else if (mood === 'formal') {
    return "For a formal occasion, consider a tailored suit in navy, charcoal, or black. Pair it with a crisp dress shirt and a coordinating tie. Complete the look with polished leather dress shoes and subtle accessories like a quality watch. If it's a formal event but not a business setting, you might have more flexibility with colors and patterns.";
  } else if (mood === 'business') {
    return "For a professional business look, try tailored slacks or a skirt with a button-down shirt or a modest blouse. Add a blazer for more formality. Stick to a professional color palette of navy, gray, black, and white with subtle accent colors. Closed-toe shoes like loafers, modest heels, or oxfords complete the look.";
  } else if (mood === 'adventurous') {
    return "For an adventurous outfit, mix unexpected colors or patterns! Try pairing wide-leg pants with a fitted crop top, or layer a bright blazer over a graphic tee. Don't be afraid to mix textures like silk with denim or leather with knitwear. Statement accessories can really elevate this look - bold earrings, unique shoes, or an eye-catching bag.";
  } else if (mood === 'provocative') {
    return "For a more daring, provocative outfit that's still tasteful, consider pieces that highlight your favorite features while maintaining balance. A form-fitting dress with strategic cutouts, or high-waisted pants paired with a bodysuit or crop top can create a stunning silhouette. The key is to find the right balance - when showing more skin in one area, keep other areas more covered. Confidence is the most important element of pulling off a bold look!";
  } else {
    return "Based on your style preferences, I'd recommend building outfits around core pieces that make you feel confident. Start with well-fitting basics like quality jeans, versatile t-shirts, and a few button-downs, then add personality with accessories and layering pieces that reflect your personal style. Remember that the most stylish outfits are ones where you feel comfortable and authentic!";
  }
}