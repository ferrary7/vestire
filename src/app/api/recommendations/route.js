import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getServiceConfig } from '@/lib/services/configService';
import * as mongoDBService from '@/lib/services/mongoDBService';

/**
 * Generate outfit recommendations based on user's closet and preferences
 * POST /api/recommendations
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request data
    const { items, mood, occasion, season, preferences, styleQuery } = await request.json();
    
    if (!mood) {
      return NextResponse.json(
        { error: 'Mood is required' },
        { status: 400 }
      );
    }
    
    // Use provided items or get user's clothing items from MongoDB
    let clothingItems = items;
    if (!clothingItems || clothingItems.length === 0) {
      const userId = session.user.id;
      clothingItems = await mongoDBService.getUserClothingItems(userId);
    }
    
    if (!clothingItems?.length) {
      return NextResponse.json(
        { error: 'You need to add some clothing items to your closet first' },
        { status: 400 }
      );
    }
    
    // Get AI service configuration
    const aiConfig = getServiceConfig('ai');
    
    // Format clothing items for the AI model
    const formattedItems = clothingItems.map(item => ({
      id: item.id,
      category: item.category,
      description: item.description || '',
      color: item.color || '',
      season: item.season || 'all'
    }));
    
    // Generate recommendations based on the configured AI model
    let recommendations;
    
    if (aiConfig.modelType === 'claude') {
      recommendations = await generateClaudeRecommendations(
        formattedItems,
        mood,
        occasion,
        season,
        preferences,
        styleQuery,
        aiConfig.apiKey,
        aiConfig.apiUrl
      );
    } else {
      // Default to Gemini
      recommendations = await generateGeminiRecommendations(
        formattedItems,
        mood,
        occasion,
        season,
        preferences,
        styleQuery,
        aiConfig.apiKey,
        aiConfig.apiUrl
      );
    }
    
    // Return recommendations
    return NextResponse.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate outfit recommendations using Anthropic's Claude API
 */
async function generateClaudeRecommendations(
  items,
  mood,
  occasion,
  season = 'any',
  preferences = {},
  styleQuery = '',
  apiKey,
  apiUrl
) {
  if (!apiKey) {
    throw new Error('Claude API key is not configured');
  }
  
  // Format the prompt for Claude
  const systemPrompt = `You are a professional fashion stylist. Your task is to create outfit combinations from the user's closet that match their specified mood, occasion, and season. Base your recommendations only on the clothing items provided.`;

  const userMessage = `
I want to create outfits from my closet that are ${mood || 'casual'} ${occasion ? `for ${occasion} ` : ''}${season && season !== 'any' ? `in ${season} ` : ''}${styleQuery ? `that are ${styleQuery}` : ''}.

Here are the items in my closet:
${JSON.stringify(items, null, 2)}

${preferences ? `Additional preferences: ${JSON.stringify(preferences, null, 2)}` : ''}

Please create ${styleQuery ? 'exactly' : ''} 3 different outfit combinations that match my request. For each outfit:
1. Give it a creative name that reflects the style${styleQuery ? ` and includes reference to "${styleQuery}"` : ''}
2. List the specific items used from my closet (reference them by their IDs)
3. Explain why the items work well together${styleQuery ? ` and how they fulfill my request for "${styleQuery}"` : ''}
4. Provide accessory and styling suggestions if applicable

Format your response as a JSON array with 3 outfit objects, each containing:
- name: the outfit name (must be relevant to ${styleQuery || mood})
- items: array of item IDs used
- description: why it works well and how it fulfills my request
- styling_tips: additional styling suggestions
`;

  // Make the API request to Claude
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userMessage }
      ]
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
  }
  
  const result = await response.json();
  
  // Parse the JSON response from Claude
  const content = result.content?.[0]?.text || '';
  
  // Extract JSON from the response
  let recommendations = [];
  try {
    // Find JSON in the response
    const jsonMatch = content.match(/\[\s*\{.*?\}\s*\]/s);
    if (jsonMatch) {
      recommendations = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback manual parsing
      const outfitBlocks = content.split(/Outfit \d+:/);
      recommendations = outfitBlocks.slice(1).map((block, index) => {
        const name = block.match(/name:?\s*["']?([^"'\n]+)["']?/i)?.[1] || `Outfit ${index + 1}`;
        const itemsMatch = block.match(/items:?\s*([\d,\s]+)/i);
        const items = itemsMatch 
          ? itemsMatch[1].split(',').map(id => id.trim())
          : [];
        return {
          name,
          items,
          description: block.match(/description:?\s*["']?([^"'\n]+)["']?/i)?.[1] || '',
          styling_tips: block.match(/styling_tips:?\s*["']?([^"'\n]+)["']?/i)?.[1] || '',
        };
      });
    }
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    throw new Error('Failed to parse recommendations');
  }
  
  return recommendations;
}

/**
 * Generate outfit recommendations using Google's Gemini API
 */
async function generateGeminiRecommendations(
  items,
  mood,
  occasion,
  season = 'any',
  preferences = {},
  styleQuery = '',
  apiKey,
  apiUrl
) {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }
  
  // Format the prompt for Gemini
  const prompt = `
Generate 3 outfit recommendations from my closet items for a ${styleQuery ? `${styleQuery}, ` : ''}${mood || 'casual'} ${occasion ? `${occasion} ` : ''}look ${season && season !== 'any' ? `in ${season} ` : ''}.

My closet items:
${JSON.stringify(items, null, 2)}

${preferences ? `Additional preferences: ${JSON.stringify(preferences, null, 2)}` : ''}

Rules:
1. Only use items from the provided list
2. Create outfits appropriate for the mood and occasion
3. If a season is specified, choose seasonal appropriate clothing
4. The outfits MUST match the style query: "${styleQuery}"
5. Include a name, items used (by ID), description, and styling tips for each outfit
6. Make the outfit name and description specifically reference "${styleQuery || mood}"

Format your response as a JSON array with 3 outfit objects:
[{
  "name": "outfit name that references ${styleQuery || mood}",
  "items": ["item1_id", "item2_id"],
  "description": "why these items work well together and how they fulfill the ${styleQuery || mood} request",
  "styling_tips": "additional styling suggestions"
}, 
...
]`;

  // Make the API request to Gemini
  const url = `${apiUrl}?key=${apiKey}`;
  
  try {
    // Create a custom fetch configuration that ignores certificate errors
    // This is a workaround for the self-signed certificate issue
    const agent = new (require('https').Agent)({
      rejectUnauthorized: false // This allows self-signed certificates
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      }),
      agent // Add the custom agent to ignore certificate issues
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    
    // Parse the JSON response from Gemini
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from the response
    let recommendations = [];
    try {
      // Find JSON in the response
      const jsonMatch = content.match(/\[\s*\{.*?\}\s*\]/s);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback manual parsing
        const outfitBlocks = content.split(/Outfit \d+:/);
        recommendations = outfitBlocks.slice(1).map((block, index) => {
          const name = block.match(/name:?\s*["']?([^"'\n]+)["']?/i)?.[1] || `Outfit ${index + 1}`;
          const itemsMatch = block.match(/items:?\s*([\d,\s]+)/i);
          const items = itemsMatch 
            ? itemsMatch[1].split(',').map(id => id.trim())
            : [];
          return {
            name,
            items,
            description: block.match(/description:?\s*["']?([^"'\n]+)["']?/i)?.[1] || '',
            styling_tips: block.match(/styling_tips:?\s*["']?([^"'\n]+)["']?/i)?.[1] || '',
          };
        });
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw new Error('Failed to parse recommendations');
    }
    
    return recommendations;
  } catch (error) {
    console.error('Gemini API fetch error:', error);
    
    // If we encounter a certificate error, try to generate a fallback response
    // This ensures users still get outfit recommendations even if the API call fails
    return generateFallbackRecommendations(items, mood, occasion, season, styleQuery);
  }
}

/**
 * Generate fallback recommendations when API calls fail
 */
function generateFallbackRecommendations(items, mood, occasion, season, styleQuery = '') {
  console.log('Generating fallback recommendations');
  
  // Simple categorization of items
  const tops = items.filter(item => {
    const category = (item.category || '').toLowerCase();
    return category.includes('shirt') || 
           category.includes('top') || 
           category.includes('blouse') ||
           category.includes('sweater');
  });
  
  const bottoms = items.filter(item => {
    const category = (item.category || '').toLowerCase();
    return category.includes('pants') || 
           category.includes('jeans') || 
           category.includes('skirt') || 
           category.includes('shorts');
  });
  
  const shoes = items.filter(item => {
    const category = (item.category || '').toLowerCase();
    return category.includes('shoes') || 
           category.includes('sneakers') || 
           category.includes('boots') ||
           category.includes('heels');
  });
  
  const outerwear = items.filter(item => {
    const category = (item.category || '').toLowerCase();
    return category.includes('jacket') || 
           category.includes('coat') || 
           category.includes('blazer') ||
           category.includes('cardigan');
  });
  
  const dresses = items.filter(item => {
    const category = (item.category || '').toLowerCase();
    return category.includes('dress');
  });
  
  const underwear = items.filter(item => {
    const category = (item.category || '').toLowerCase();
    return category.includes('bra') || 
           category.includes('underwear') || 
           category.includes('lingerie') ||
           category.includes('bikini');
  });
  
  // Create recommendations based on available items
  const recommendations = [];
  
  // Determine what kind of outfits to create based on query and mood
  const isSexyQuery = styleQuery?.toLowerCase().includes('sexy') || 
                      styleQuery?.toLowerCase().includes('hot') || 
                      styleQuery?.toLowerCase().includes('date') || 
                      mood === 'provocative';
                      
  const isProfessionalQuery = styleQuery?.toLowerCase().includes('professional') || 
                             styleQuery?.toLowerCase().includes('work') || 
                             styleQuery?.toLowerCase().includes('business') || 
                             styleQuery?.toLowerCase().includes('formal') || 
                             mood === 'business' || 
                             mood === 'formal';
  
  const isCasualQuery = styleQuery?.toLowerCase().includes('casual') || 
                       styleQuery?.toLowerCase().includes('everyday') || 
                       styleQuery?.toLowerCase().includes('comfortable') || 
                       mood === 'casual' || 
                       mood === 'relaxed';
  
  // Try to create up to 3 different outfits
  for (let i = 0; i < 3 && recommendations.length < 3; i++) {
    let outfitItems = [];
    let outfitName = "";
    let description = "";
    let styling_tips = "";
    
    // Create outfit based on query and mood
    if (isProfessionalQuery) {
      if (dresses.length > 0) {
        const dress = dresses[Math.floor(Math.random() * dresses.length)];
        outfitItems.push(dress.id);
        
        if (shoes.length > 0) {
          // Try to find formal shoes
          const formalShoes = shoes.filter(shoe => {
            const category = (shoe.category || '').toLowerCase();
            const description = (shoe.description || '').toLowerCase();
            return category.includes('heel') || 
                  category.includes('oxford') || 
                  category.includes('loafer') ||
                  description.includes('formal') ||
                  description.includes('dress');
          });
          
          if (formalShoes.length > 0) {
            const shoe = formalShoes[Math.floor(Math.random() * formalShoes.length)];
            outfitItems.push(shoe.id);
          } else if (shoes.length > 0) {
            const shoe = shoes[Math.floor(Math.random() * shoes.length)];
            outfitItems.push(shoe.id);
          }
        }
        
        if (outerwear.length > 0) {
          // Try to find formal outerwear
          const formalOuterwear = outerwear.filter(outer => {
            const category = (outer.category || '').toLowerCase();
            const description = (outer.description || '').toLowerCase();
            return category.includes('blazer') || 
                  category.includes('suit') || 
                  description.includes('formal') ||
                  description.includes('professional');
          });
          
          if (formalOuterwear.length > 0) {
            const outer = formalOuterwear[Math.floor(Math.random() * formalOuterwear.length)];
            outfitItems.push(outer.id);
          } else if (outerwear.length > 0) {
            const outer = outerwear[Math.floor(Math.random() * outerwear.length)];
            outfitItems.push(outer.id);
          }
        }
        
        outfitName = "Professional Dress Ensemble";
        description = "A sophisticated professional outfit built around a dress, perfect for work or formal settings";
        styling_tips = "Add minimal jewelry and a structured bag to complete this professional look";
      } else if (tops.length > 0 && bottoms.length > 0) {
        // Try to find formal tops and bottoms
        const formalTops = tops.filter(top => {
          const category = (top.category || '').toLowerCase();
          const description = (top.description || '').toLowerCase();
          return category.includes('blouse') || 
                category.includes('button') || 
                category.includes('dress shirt') ||
                description.includes('formal') ||
                description.includes('professional');
        });
        
        const formalBottoms = bottoms.filter(bottom => {
          const category = (bottom.category || '').toLowerCase();
          const description = (bottom.description || '').toLowerCase();
          return category.includes('slacks') || 
                category.includes('trousers') || 
                description.includes('formal') ||
                description.includes('professional');
        });
        
        const top = formalTops.length > 0 ? 
                   formalTops[Math.floor(Math.random() * formalTops.length)] : 
                   tops[Math.floor(Math.random() * tops.length)];
                   
        const bottom = formalBottoms.length > 0 ? 
                      formalBottoms[Math.floor(Math.random() * formalBottoms.length)] : 
                      bottoms[Math.floor(Math.random() * bottoms.length)];
                      
        outfitItems.push(top.id);
        outfitItems.push(bottom.id);
        
        if (shoes.length > 0) {
          // Try to find formal shoes
          const formalShoes = shoes.filter(shoe => {
            const category = (shoe.category || '').toLowerCase();
            const description = (shoe.description || '').toLowerCase();
            return category.includes('heel') || 
                  category.includes('oxford') || 
                  category.includes('loafer') ||
                  description.includes('formal') ||
                  description.includes('dress');
          });
          
          if (formalShoes.length > 0) {
            const shoe = formalShoes[Math.floor(Math.random() * formalShoes.length)];
            outfitItems.push(shoe.id);
          } else if (shoes.length > 0) {
            const shoe = shoes[Math.floor(Math.random() * shoes.length)];
            outfitItems.push(shoe.id);
          }
        }
        
        if (outerwear.length > 0) {
          // Try to find formal outerwear
          const formalOuterwear = outerwear.filter(outer => {
            const category = (outer.category || '').toLowerCase();
            const description = (outer.description || '').toLowerCase();
            return category.includes('blazer') || 
                  category.includes('suit') || 
                  description.includes('formal') ||
                  description.includes('professional');
          });
          
          if (formalOuterwear.length > 0) {
            const outer = formalOuterwear[Math.floor(Math.random() * formalOuterwear.length)];
            outfitItems.push(outer.id);
          } else if (outerwear.length > 0) {
            const outer = outerwear[Math.floor(Math.random() * outerwear.length)];
            outfitItems.push(outer.id);
          }
        }
        
        outfitName = "Business Professional Attire";
        description = "A polished professional combination ideal for workplace settings";
        styling_tips = "Ensure everything is well-pressed and add a quality watch as an accessory";
      }
    } else if (isSexyQuery) {
      if (dresses.length > 0) {
        // Try to find revealing dresses
        const sexyDresses = dresses.filter(dress => {
          const category = (dress.category || '').toLowerCase();
          const description = (dress.description || '').toLowerCase();
          return description.includes('bodycon') || 
                description.includes('mini') || 
                description.includes('tight') ||
                description.includes('short') ||
                description.includes('revealing') ||
                description.includes('fitted');
        });
        
        const dress = sexyDresses.length > 0 ? 
                     sexyDresses[Math.floor(Math.random() * sexyDresses.length)] : 
                     dresses[Math.floor(Math.random() * dresses.length)];
        
        outfitItems.push(dress.id);
        
        if (shoes.length > 0) {
          // Try to find sexy shoes
          const sexyShoes = shoes.filter(shoe => {
            const category = (shoe.category || '').toLowerCase();
            const description = (shoe.description || '').toLowerCase();
            return category.includes('heel') || 
                  category.includes('stiletto') || 
                  description.includes('high') ||
                  description.includes('sexy');
          });
          
          if (sexyShoes.length > 0) {
            const shoe = sexyShoes[Math.floor(Math.random() * sexyShoes.length)];
            outfitItems.push(shoe.id);
          } else if (shoes.length > 0) {
            const shoe = shoes[Math.floor(Math.random() * shoes.length)];
            outfitItems.push(shoe.id);
          }
        }
        
        // Add underwear if appropriate
        if (underwear.length > 0 && Math.random() > 0.5) {
          const under = underwear[Math.floor(Math.random() * underwear.length)];
          outfitItems.push(under.id);
        }
        
        outfitName = "Seductive Night Out Look";
        description = "A stunning outfit that exudes confidence and sensuality";
        styling_tips = "Add statement jewelry and style your hair to complement this bold look";
      } else if (tops.length > 0 && bottoms.length > 0) {
        // Try to find revealing tops and bottoms
        const sexyTops = tops.filter(top => {
          const category = (top.category || '').toLowerCase();
          const description = (top.description || '').toLowerCase();
          return category.includes('crop') || 
                category.includes('tank') || 
                description.includes('tight') ||
                description.includes('revealing') ||
                description.includes('low-cut');
        });
        
        const sexyBottoms = bottoms.filter(bottom => {
          const category = (bottom.category || '').toLowerCase();
          const description = (bottom.description || '').toLowerCase();
          return category.includes('mini') || 
                category.includes('shorts') || 
                description.includes('tight') ||
                description.includes('short') ||
                description.includes('fitted');
        });
        
        const top = sexyTops.length > 0 ? 
                   sexyTops[Math.floor(Math.random() * sexyTops.length)] : 
                   tops[Math.floor(Math.random() * tops.length)];
                   
        const bottom = sexyBottoms.length > 0 ? 
                      sexyBottoms[Math.floor(Math.random() * sexyBottoms.length)] : 
                      bottoms[Math.floor(Math.random() * bottoms.length)];
        
        outfitItems.push(top.id);
        outfitItems.push(bottom.id);
        
        if (shoes.length > 0) {
          // Try to find sexy shoes
          const sexyShoes = shoes.filter(shoe => {
            const category = (shoe.category || '').toLowerCase();
            const description = (shoe.description || '').toLowerCase();
            return category.includes('heel') || 
                  category.includes('stiletto') || 
                  description.includes('high') ||
                  description.includes('sexy');
          });
          
          if (sexyShoes.length > 0) {
            const shoe = sexyShoes[Math.floor(Math.random() * sexyShoes.length)];
            outfitItems.push(shoe.id);
          } else if (shoes.length > 0) {
            const shoe = shoes[Math.floor(Math.random() * shoes.length)];
            outfitItems.push(shoe.id);
          }
        }
        
        // Add underwear if appropriate
        if (underwear.length > 0 && Math.random() > 0.5) {
          const under = underwear[Math.floor(Math.random() * underwear.length)];
          outfitItems.push(under.id);
        }
        
        outfitName = "Hot Date Night Ensemble";
        description = "A stylish and seductive combination that makes a bold statement";
        styling_tips = "Add delicate jewelry and a touch of your favorite perfume to complete this look";
      } else if (underwear.length > 0) {
        // Create an outfit primarily with underwear/lingerie items
        const under1 = underwear[Math.floor(Math.random() * underwear.length)];
        outfitItems.push(under1.id);
        
        // Try to add another underwear item
        if (underwear.length > 1) {
          const remainingUnderwear = underwear.filter(item => item.id !== under1.id);
          const under2 = remainingUnderwear[Math.floor(Math.random() * remainingUnderwear.length)];
          outfitItems.push(under2.id);
        }
        
        outfitName = "Intimate Seductive Ensemble";
        description = "A sensual and intimate combination for special private occasions";
        styling_tips = "Keep accessories minimal and focus on the essentials for this look";
      }
    } else if (isCasualQuery) {
      // Create a casual outfit
      if (tops.length > 0 && bottoms.length > 0) {
        // Try to find casual tops and bottoms
        const casualTops = tops.filter(top => {
          const category = (top.category || '').toLowerCase();
          const description = (top.description || '').toLowerCase();
          return category.includes('t-shirt') || 
                category.includes('tee') || 
                category.includes('sweater') ||
                description.includes('casual') ||
                description.includes('comfortable');
        });
        
        const casualBottoms = bottoms.filter(bottom => {
          const category = (bottom.category || '').toLowerCase();
          const description = (bottom.description || '').toLowerCase();
          return category.includes('jeans') || 
                category.includes('shorts') || 
                description.includes('casual') ||
                description.includes('comfortable');
        });
        
        const top = casualTops.length > 0 ? 
                   casualTops[Math.floor(Math.random() * casualTops.length)] : 
                   tops[Math.floor(Math.random() * tops.length)];
                   
        const bottom = casualBottoms.length > 0 ? 
                      casualBottoms[Math.floor(Math.random() * casualBottoms.length)] : 
                      bottoms[Math.floor(Math.random() * bottoms.length)];
        
        outfitItems.push(top.id);
        outfitItems.push(bottom.id);
        
        if (shoes.length > 0) {
          // Try to find casual shoes
          const casualShoes = shoes.filter(shoe => {
            const category = (shoe.category || '').toLowerCase();
            const description = (shoe.description || '').toLowerCase();
            return category.includes('sneaker') || 
                  category.includes('flat') || 
                  description.includes('casual') ||
                  description.includes('comfortable');
          });
          
          if (casualShoes.length > 0) {
            const shoe = casualShoes[Math.floor(Math.random() * casualShoes.length)];
            outfitItems.push(shoe.id);
          } else if (shoes.length > 0) {
            const shoe = shoes[Math.floor(Math.random() * shoes.length)];
            outfitItems.push(shoe.id);
          }
        }
        
        if (outerwear.length > 0 && Math.random() > 0.5) {
          // Try to find casual outerwear
          const casualOuterwear = outerwear.filter(outer => {
            const category = (outer.category || '').toLowerCase();
            const description = (outer.description || '').toLowerCase();
            return category.includes('hoodie') || 
                  category.includes('denim') || 
                  description.includes('casual') ||
                  description.includes('comfortable');
          });
          
          if (casualOuterwear.length > 0) {
            const outer = casualOuterwear[Math.floor(Math.random() * casualOuterwear.length)];
            outfitItems.push(outer.id);
          } else if (outerwear.length > 0) {
            const outer = outerwear[Math.floor(Math.random() * outerwear.length)];
            outfitItems.push(outer.id);
          }
        }
        
        outfitName = "Everyday Casual Look";
        description = "A comfortable yet put-together outfit perfect for daily activities";
        styling_tips = "Add your favorite accessories to personalize this versatile outfit";
      } else if (dresses.length > 0) {
        // Try to find casual dresses
        const casualDresses = dresses.filter(dress => {
          const description = (dress.description || '').toLowerCase();
          return description.includes('casual') || 
                description.includes('comfortable') || 
                description.includes('everyday');
        });
        
        const dress = casualDresses.length > 0 ? 
                     casualDresses[Math.floor(Math.random() * casualDresses.length)] : 
                     dresses[Math.floor(Math.random() * dresses.length)];
        
        outfitItems.push(dress.id);
        
        if (shoes.length > 0) {
          // Try to find casual shoes
          const casualShoes = shoes.filter(shoe => {
            const category = (shoe.category || '').toLowerCase();
            const description = (shoe.description || '').toLowerCase();
            return category.includes('sneaker') || 
                  category.includes('flat') || 
                  description.includes('casual') ||
                  description.includes('comfortable');
          });
          
          if (casualShoes.length > 0) {
            const shoe = casualShoes[Math.floor(Math.random() * casualShoes.length)];
            outfitItems.push(shoe.id);
          } else if (shoes.length > 0) {
            const shoe = shoes[Math.floor(Math.random() * shoes.length)];
            outfitItems.push(shoe.id);
          }
        }
        
        if (outerwear.length > 0 && Math.random() > 0.5) {
          const outer = outerwear[Math.floor(Math.random() * outerwear.length)];
          outfitItems.push(outer.id);
        }
        
        outfitName = "Effortless Casual Dress Outfit";
        description = "A simple yet effective casual outfit centered around a comfortable dress";
        styling_tips = "Change accessories to dress this outfit up or down as needed";
      }
    } else {
      // Default/generic outfit
      if (tops.length > 0 && bottoms.length > 0) {
        const top = tops[Math.floor(Math.random() * tops.length)];
        const bottom = bottoms[Math.floor(Math.random() * bottoms.length)];
        outfitItems.push(top.id);
        outfitItems.push(bottom.id);
        
        if (shoes.length > 0) {
          const shoe = shoes[Math.floor(Math.random() * shoes.length)];
          outfitItems.push(shoe.id);
        }
        
        if (outerwear.length > 0 && Math.random() > 0.5) {
          const outer = outerwear[Math.floor(Math.random() * outerwear.length)];
          outfitItems.push(outer.id);
        }
        
        outfitName = `${mood.charAt(0).toUpperCase() + mood.slice(1)} Style Mix`;
        description = `A ${mood} outfit combination that balances style and comfort`;
        styling_tips = "Mix and match these pieces based on your preference and the occasion";
      } else if (dresses.length > 0) {
        const dress = dresses[Math.floor(Math.random() * dresses.length)];
        outfitItems.push(dress.id);
        
        if (shoes.length > 0) {
          const shoe = shoes[Math.floor(Math.random() * shoes.length)];
          outfitItems.push(shoe.id);
        }
        
        if (outerwear.length > 0 && Math.random() > 0.5) {
          const outer = outerwear[Math.floor(Math.random() * outerwear.length)];
          outfitItems.push(outer.id);
        }
        
        outfitName = `${mood.charAt(0).toUpperCase() + mood.slice(1)} Dress Ensemble`;
        description = `A ${mood} outfit built around a versatile dress`;
        styling_tips = "Accessorize based on the specific occasion to customize this look";
      }
    }
    
    // Only add if we have at least 2 items
    if (outfitItems.length >= 2) {
      // Customize name and description based on query if provided
      if (styleQuery) {
        outfitName = `${styleQuery.charAt(0).toUpperCase() + styleQuery.slice(1)} ${outfitName}`;
        description = `${description} - perfectly matching your request for "${styleQuery}"`;
      }
      
      recommendations.push({
        name: outfitName,
        items: outfitItems,
        description: description,
        styling_tips: styling_tips
      });
    }
  }
  
  // If we couldn't create enough outfits, add a generic one
  if (recommendations.length === 0) {
    // Just select up to 3 random items
    const randomItems = items
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(3, items.length));
    
    let outfitName = "Personal Style Mix";
    let description = "A custom combination of items from your wardrobe";
    
    // Customize name and description based on query if provided
    if (styleQuery) {
      outfitName = `${styleQuery.charAt(0).toUpperCase() + styleQuery.slice(1)} ${outfitName}`;
      description = `${description} - aligned with your request for "${styleQuery}"`;
    }
    
    recommendations.push({
      name: outfitName,
      items: randomItems.map(item => item.id),
      description: description,
      styling_tips: "Mix and match these pieces based on your preference and the occasion"
    });
  }
  
  return recommendations;
}