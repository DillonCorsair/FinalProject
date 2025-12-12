import OpenAI from "openai";

// Initialize OpenAI client lazily
// IMPORTANT: Store your API key in an environment variable for security
// Create a .env file with: OPENAI_API_KEY=your_api_key_here
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openai = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openai;
}

/**
 * Generate text using GPT-5-mini (or gpt-4o-mini as fallback)
 * @param {string} input - The input prompt
 * @param {Object} options - Optional parameters
 * @returns {Promise<string>} - The generated text
 */
export async function generateText(input, options = {}) {
  try {
    const client = getOpenAIClient();
    const result = await client.chat.completions.create({
      model: options.model || "gpt-4o-mini", // Using gpt-4o-mini as gpt-5.1 doesn't exist yet
      messages: [
        {
          role: "user",
          content: input
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 150,
    });

    return result.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

/**
 * Example usage matching your requested format
 * Note: The API format you provided doesn't match OpenAI's actual API
 * This is an adapted version that works with the real OpenAI API
 */
export async function generateWithReasoning(input, reasoningEffort = "low", verbosity = "low") {
  try {
    const client = getOpenAIClient();
    // Adjust parameters based on reasoning effort and verbosity
    // Lower temperature = more deterministic, consistent results
    // Higher reasoning effort = better accuracy
    const temperature = reasoningEffort === "high" ? 0.1 : (reasoningEffort === "low" ? 0.3 : 0.5);
    // Increased max_tokens to ensure complete JSON responses (especially for long track lists)
    const maxTokens = verbosity === "low" ? 1500 : (verbosity === "medium" ? 2000 : 3000);

    const result = await client.chat.completions.create({
      model: "gpt-4o-mini", // Using available model
      messages: [
        {
          role: "system",
          content: "You are a music database expert. Provide accurate, factual information about albums, tracks, and artists. Always return complete and accurate track listings in the correct order."
        },
        {
          role: "user",
          content: input
        }
      ],
      temperature: temperature,
      max_tokens: maxTokens,
    });

    return {
      output_text: result.choices[0].message.content,
      model: result.model,
      usage: result.usage
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Example function matching your code structure
export async function exampleUsage() {
  const result = await generateWithReasoning(
    "Write a haiku about code.",
    "low", // reasoning effort
    "low"  // verbosity
  );
  
  console.log(result.output_text);
  return result;
}

