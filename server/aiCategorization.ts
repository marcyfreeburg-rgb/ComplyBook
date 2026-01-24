// Referenced from javascript_openai_ai_integrations blueprint
import OpenAI from "openai";
import { storage } from "./storage";

// Support both Replit's AI Integrations and standard OpenAI API
// - On Replit: Uses AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY
// - On external deployments (Render, etc.): Uses OPENAI_API_KEY with standard OpenAI endpoint
const isReplitEnvironment = !!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;


const openai = isReplitEnvironment 
  ? new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    })
  : hasOpenAIKey 
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    : null;

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
  // Check if AI is available
  if (!openai) {
    console.log('[AI Categorization] AI not available - no API key configured');
    return null;
  }

  try {
    // Get all categories for this organization
    const categories = await storage.getCategories(organizationId);
    
    if (categories.length === 0) {
      console.log(`[AI Categorization] No categories found for organization ${organizationId}`);
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
      console.log(`[AI Categorization] No ${transactionType} categories found for organization ${organizationId}. Total categories: ${categories.length}`);
      return null;
    }

    // Get existing categorized transactions to learn from (up to 5 examples per category)
    const existingTransactions = await storage.getTransactions(organizationId);
    const categorizedExamples: Map<number, string[]> = new Map();
    
    for (const cat of relevantCategories) {
      const catTransactions = existingTransactions
        .filter(t => t.categoryId === cat.id && t.description)
        .slice(0, 5)
        .map(t => t.description);
      if (catTransactions.length > 0) {
        categorizedExamples.set(cat.id, catTransactions);
      }
    }

    // Build the prompt for AI with learning examples
    const categoryList = relevantCategories.map(cat => {
      const examples = categorizedExamples.get(cat.id);
      const examplesText = examples && examples.length > 0 
        ? `\n    Examples: ${examples.map(e => `"${e}"`).join(', ')}`
        : '';
      return `- ID: ${cat.id}, Name: "${cat.name}", Description: "${cat.description || 'No description'}"${examplesText}`;
    }).join('\n');

    const prompt = `You are a financial categorization expert. Analyze this transaction and suggest the most appropriate category.
Learn from the examples provided for each category - they show how similar transactions have been categorized previously.

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

    // Use gpt-4o for standard OpenAI API (widely available), gpt-5 for Replit AI Integrations
    const modelName = isReplitEnvironment ? "gpt-5" : "gpt-4o";
    const completion = await openai.chat.completions.create({
      model: modelName,
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

    console.log(`[AI Categorization] Raw AI response for "${transactionDescription}": ${responseText}`);
    
    const suggestion = JSON.parse(responseText) as CategorySuggestion;
    
    // Validate the suggestion - check if category ID exists
    let categoryExists = relevantCategories.find(cat => cat.id === suggestion.categoryId);
    
    // If category ID doesn't match, try to find by name (AI sometimes returns wrong ID but correct name)
    if (!categoryExists && suggestion.categoryName) {
      categoryExists = relevantCategories.find(cat => 
        cat.name.toLowerCase() === suggestion.categoryName.toLowerCase()
      );
      if (categoryExists) {
        console.log(`[AI Categorization] Fixed category ID mismatch: "${suggestion.categoryName}" -> ID ${categoryExists.id}`);
        suggestion.categoryId = categoryExists.id;
      }
    }
    
    if (!categoryExists) {
      console.error(`[AI Categorization] AI suggested invalid category: ID=${suggestion.categoryId}, Name="${suggestion.categoryName}". Available categories: ${relevantCategories.map(c => `${c.id}:${c.name}`).join(', ')}`);
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
  
  // Check if AI is available before processing
  if (!openai) {
    console.log('[AI Categorization] AI not available - no API key configured');
    return suggestions;
  }

  if (transactions.length === 0) {
    return suggestions;
  }

  try {
    // Fetch categories and examples ONCE for the entire batch
    const categories = await storage.getCategories(organizationId);
    if (categories.length === 0) {
      console.log(`[AI Bulk Categorization] No categories found for organization ${organizationId}`);
      return suggestions;
    }

    // Get existing transactions for learning examples
    const existingTransactions = await storage.getTransactions(organizationId);
    
    // Build category info with examples for both income and expense
    const buildCategoryList = (type: 'income' | 'expense') => {
      const relevantCategories = categories.filter(cat => cat.type === type);
      return relevantCategories.map(cat => {
        const examples = existingTransactions
          .filter(t => t.categoryId === cat.id && t.description)
          .slice(0, 3)
          .map(t => t.description);
        const examplesText = examples.length > 0 ? ` Examples: ${examples.map(e => `"${e}"`).join(', ')}` : '';
        return `  - ID: ${cat.id}, Name: "${cat.name}"${examplesText}`;
      }).join('\n');
    };

    const incomeCategories = buildCategoryList('income');
    const expenseCategories = buildCategoryList('expense');

    // Build batch of transactions for categorization
    const transactionList = transactions.map((t, idx) => 
      `${idx + 1}. ID: ${t.id}, Type: ${t.type}, Amount: $${t.amount}, Description: "${t.description}"`
    ).join('\n');

    const prompt = `You are a financial categorization expert. Categorize ALL of the following transactions.

INCOME Categories:
${incomeCategories}

EXPENSE Categories:
${expenseCategories}

Transactions to categorize:
${transactionList}

Instructions:
1. For EACH transaction, choose the most appropriate category based on its type (income/expense)
2. Provide confidence scores (0-100) and brief reasoning
3. Use the transaction ID exactly as provided

Respond with a JSON object containing an array of suggestions:
{
  "suggestions": [
    {"transactionId": <number>, "categoryId": <number>, "categoryName": "<string>", "confidence": <number>, "reasoning": "<brief>"},
    ...
  ]
}`;

    const modelName = isReplitEnvironment ? "gpt-5" : "gpt-4o";
    console.log(`[AI Bulk Categorization] Processing ${transactions.length} transactions in single batch...`);
    
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { 
          role: "system", 
          content: "You are a financial categorization expert. Categorize all transactions in a single response. Always respond with valid JSON." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.error('[AI Bulk Categorization] No response from AI');
      return suggestions;
    }

    console.log(`[AI Bulk Categorization] Received response, parsing...`);
    
    const parsed = JSON.parse(responseText) as { suggestions: Array<CategorySuggestion & { transactionId: number }> };
    
    // Validate and add each suggestion
    for (const suggestion of parsed.suggestions || []) {
      const transaction = transactions.find(t => t.id === suggestion.transactionId);
      if (!transaction) continue;

      // Validate category exists and matches transaction type
      const relevantCategories = categories.filter(c => c.type === transaction.type);
      let categoryExists = relevantCategories.find(cat => cat.id === suggestion.categoryId);
      
      // Try to find by name if ID doesn't match
      if (!categoryExists && suggestion.categoryName) {
        categoryExists = relevantCategories.find(cat => 
          cat.name.toLowerCase() === suggestion.categoryName.toLowerCase()
        );
        if (categoryExists) {
          suggestion.categoryId = categoryExists.id;
        }
      }
      
      if (categoryExists) {
        suggestions.set(suggestion.transactionId, {
          categoryId: suggestion.categoryId,
          categoryName: suggestion.categoryName,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning
        });
      }
    }

    console.log(`[AI Bulk Categorization] Successfully categorized ${suggestions.size} of ${transactions.length} transactions`);
    return suggestions;
  } catch (error) {
    console.error('[AI Bulk Categorization] Error:', error);
    return suggestions;
  }
}
