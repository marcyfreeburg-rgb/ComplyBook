// Referenced from javascript_openai_ai_integrations blueprint
import OpenAI from "openai";
import { storage } from "./storage";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reasoning: string;
}

export async function suggestCategory(
  organizationId: number,
  transactionDescription: string,
  transactionAmount: number,
  transactionType: 'income' | 'expense'
): Promise<CategorySuggestion | null> {
  try {
    // Get all categories for this organization
    const categories = await storage.getCategories(organizationId);
    
    if (categories.length === 0) {
      return null;
    }

    // Filter categories based on transaction type and category type
    // For income transactions: use income categories
    // For expense transactions: use expense categories
    const relevantCategories = categories.filter(cat => {
      if (transactionType === 'income') {
        return cat.type === 'income';
      } else {
        return cat.type === 'expense';
      }
    });

    if (relevantCategories.length === 0) {
      return null;
    }

    // Build the prompt for AI
    const categoryList = relevantCategories.map(cat => 
      `- ID: ${cat.id}, Name: "${cat.name}", Description: "${cat.description || 'No description'}"`
    ).join('\n');

    const prompt = `You are a financial categorization expert. Analyze this transaction and suggest the most appropriate category.

Transaction Details:
- Description: "${transactionDescription}"
- Amount: $${transactionAmount}
- Type: ${transactionType}

Available Categories:
${categoryList}

Instructions:
1. Choose the MOST appropriate category based on the transaction description
2. Provide a confidence score (0-100) for your suggestion
3. Explain your reasoning briefly

Respond ONLY with valid JSON in this exact format:
{
  "categoryId": <number>,
  "categoryName": "<string>",
  "confidence": <number between 0-100>,
  "reasoning": "<brief explanation>"
}`;

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { 
          role: "system", 
          content: "You are a financial categorization expert that always responds with valid JSON." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.error('[AI Categorization] No response from AI');
      return null;
    }

    const suggestion = JSON.parse(responseText) as CategorySuggestion;
    
    // Validate the suggestion
    const categoryExists = relevantCategories.find(cat => cat.id === suggestion.categoryId);
    if (!categoryExists) {
      console.error('[AI Categorization] AI suggested invalid category ID');
      return null;
    }

    console.log(`[AI Categorization] Suggested category "${suggestion.categoryName}" with ${suggestion.confidence}% confidence`);
    
    return suggestion;
  } catch (error) {
    console.error('[AI Categorization] Error:', error);
    return null;
  }
}

export async function suggestCategoryBulk(
  organizationId: number,
  transactions: Array<{
    id: number;
    description: string;
    amount: string;
    type: 'income' | 'expense';
  }>
): Promise<Map<number, CategorySuggestion>> {
  const suggestions = new Map<number, CategorySuggestion>();
  
  // Process transactions one at a time to avoid rate limits
  for (const transaction of transactions) {
    const suggestion = await suggestCategory(
      organizationId,
      transaction.description,
      parseFloat(transaction.amount),
      transaction.type
    );
    
    if (suggestion) {
      suggestions.set(transaction.id, suggestion);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return suggestions;
}
