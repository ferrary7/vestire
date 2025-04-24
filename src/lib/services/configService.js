/**
 * Configuration service for managing API configurations
 * Centralizes access to environment variables and configuration settings
 */

/**
 * Get the currently configured AI model type
 * Can be 'gemini' or 'claude'
 */
export function getAiModelType() {
  return process.env.AI_MODEL_TYPE || 'gemini';
}

/**
 * Get the API key for AI services
 */
export function getAiApiKey() {
  const modelType = getAiModelType();
  
  // Return the appropriate API key based on model type
  if (modelType === 'claude') {
    return process.env.CLAUDE_API_KEY;
  } else {
    // Default to Gemini
    return process.env.GEMINI_API_KEY;
  }
}

/**
 * Get the API endpoint URL for AI services
 */
export function getAiApiUrl() {
  const modelType = getAiModelType();
  
  if (modelType === 'claude') {
    return 'https://api.anthropic.com/v1/messages';
  } else {
    // Default to Gemini 2.0 Flash
    return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  }
}

/**
 * Get the API key for background removal service
 */
export function getBgRemovalApiKey() {
  return process.env.REMOVE_BG_API_KEY;
}

/**
 * Get the API endpoint URL for background removal service
 */
export function getBgRemovalApiUrl() {
  return process.env.REMOVE_BG_API_URL || 'https://api.remove.bg/v1.0/removebg';
}

/**
 * Get the configuration for a specific service
 */
export function getServiceConfig(serviceName) {
  switch (serviceName) {
    case 'ai':
      return {
        modelType: getAiModelType(),
        apiKey: getAiApiKey(),
        apiUrl: getAiApiUrl()
      };
    case 'bgRemoval':
      return {
        apiKey: getBgRemovalApiKey(),
        apiUrl: getBgRemovalApiUrl()
      };
    default:
      throw new Error(`Unknown service: ${serviceName}`);
  }
}