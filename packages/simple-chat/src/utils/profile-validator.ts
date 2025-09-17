/**
 * Profile validation utilities
 */

/**
 * Check if options contain snake_case parameters
 */
export function validateProfileOptions(profile: any): void {
  if (!profile || !profile.options) {
    return;
  }

  const snakeCaseParams: string[] = [];
  const validParams = ['temperature', 'maxTokens', 'topP', 'topK', 'repetitionPenalty', 'repetitionContextSize'];
  const snakeCaseMapping: Record<string, string> = {
    'max_tokens': 'maxTokens',
    'top_p': 'topP',
    'top_k': 'topK',
    'repetition_penalty': 'repetitionPenalty',
    'repetition_context_size': 'repetitionContextSize'
  };

  // Check each option key
  for (const key of Object.keys(profile.options)) {
    // Check if it's a snake_case parameter
    if (key.includes('_')) {
      snakeCaseParams.push(key);
    }
    // Also check if it's an unknown parameter
    else if (!validParams.includes(key)) {
      // It might be a typo or unknown parameter
      console.warn(`Warning: Unknown parameter '${key}' in profile options`);
    }
  }

  // If snake_case parameters found, throw an error with helpful message
  if (snakeCaseParams.length > 0) {
    let errorMessage = 'Error: Profile contains snake_case parameters. Please use camelCase format:\n';

    for (const param of snakeCaseParams) {
      const correctParam = snakeCaseMapping[param] || param.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      errorMessage += `  - Change '${param}' to '${correctParam}'\n`;
    }

    errorMessage += '\nExample:\n';
    errorMessage += '  options:\n';
    errorMessage += '    temperature: 0.7\n';
    errorMessage += '    maxTokens: 4000\n';
    errorMessage += '    topP: 0.9\n';

    throw new Error(errorMessage);
  }
}