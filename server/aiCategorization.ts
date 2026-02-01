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

// Cache for category examples (5 minute TTL)
const categoryExamplesCache = new Map<string, { data: Map<number, string[]>; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedCategoryExamples(
  organizationId: number,
  categoryIds: number[]
): Promise<Map<number, string[]>> {
  const cacheKey = `${organizationId}:${categoryIds.sort().join(',')}`;
  const cached = categoryExamplesCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  
  // Fetch from database
  const examples = await storage.getCategoryExamples(organizationId, categoryIds, 5);
  categoryExamplesCache.set(cacheKey, { data: examples, timestamp: Date.now() });
  
  return examples;
}

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
    // OPTIMIZATION: Use cached efficient query instead of fetching ALL transactions
    const categoryIds = relevantCategories.map(cat => cat.id);
    const categorizedExamples = await getCachedCategoryExamples(organizationId, categoryIds);

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

  // Process in chunks of 25 to avoid token limits
  const CHUNK_SIZE = 25;
  const chunks: Array<typeof transactions> = [];
  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    chunks.push(transactions.slice(i, i + CHUNK_SIZE));
  }

  try {
    // Fetch categories and examples ONCE for all chunks
    const categories = await storage.getCategories(organizationId);
    if (categories.length === 0) {
      console.log(`[AI Bulk Categorization] No categories found for organization ${organizationId}`);
      return suggestions;
    }

    // OPTIMIZATION: Use cached efficient query instead of fetching ALL transactions
    const allCategoryIds = categories.map(cat => cat.id);
    const categorizedExamples = await getCachedCategoryExamples(organizationId, allCategoryIds);
    
    // Build category info with examples for both income and expense
    const buildCategoryList = (type: 'income' | 'expense') => {
      const relevantCategories = categories.filter(cat => cat.type === type);
      return relevantCategories.map(cat => {
        const examples = categorizedExamples.get(cat.id) || [];
        const limitedExamples = examples.slice(0, 2); // Reduced to 2 examples to save tokens
        const examplesText = limitedExamples.length > 0 ? ` Ex: ${limitedExamples.map(e => `"${e.slice(0, 30)}"`).join(', ')}` : '';
        return `  - ID: ${cat.id}, Name: "${cat.name}"${examplesText}`;
      }).join('\n');
    };

    const incomeCategories = buildCategoryList('income');
    const expenseCategories = buildCategoryList('expense');

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`[AI Bulk Categorization] Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} transactions)...`);

      // Build batch of transactions for categorization
      const transactionList = chunk.map((t, idx) => 
        `${idx + 1}. ID: ${t.id}, Type: ${t.type}, Amount: $${t.amount}, Desc: "${t.description.slice(0, 50)}"`
      ).join('\n');

      const prompt = `Categorize ALL transactions below. Use brief reasoning (max 10 words).

INCOME Categories:
${incomeCategories}

EXPENSE Categories:
${expenseCategories}

Transactions:
${transactionList}

Respond with JSON: {"suggestions": [{"transactionId": <id>, "categoryId": <id>, "categoryName": "<name>", "confidence": <0-100>, "reasoning": "<brief>"}]}`;

      const modelName = isReplitEnvironment ? "gpt-5" : "gpt-4o";
      
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { 
            role: "system", 
            content: "Financial categorization expert. Respond with valid JSON only. Keep reasoning under 10 words." 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        console.error(`[AI Bulk Categorization] No response for chunk ${chunkIndex + 1}`);
        continue;
      }

      try {
        const parsed = JSON.parse(responseText) as { suggestions: Array<CategorySuggestion & { transactionId: number }> };
        
        // Validate and add each suggestion
        for (const suggestion of parsed.suggestions || []) {
          const transaction = chunk.find(t => t.id === suggestion.transactionId);
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
      } catch (parseError) {
        console.error(`[AI Bulk Categorization] JSON parse error in chunk ${chunkIndex + 1}:`, parseError);
        // Continue with next chunk instead of failing entirely
      }
    }

    console.log(`[AI Bulk Categorization] Successfully categorized ${suggestions.size} of ${transactions.length} transactions`);
    return suggestions;
  } catch (error) {
    console.error('[AI Bulk Categorization] Error:', error);
    return suggestions;
  }
}

// Enhanced AI matching for grants, programs, and funds
export interface EnhancedMatchingSuggestion {
  categoryId?: number;
  categoryName?: string;
  grantId?: number;
  grantName?: string;
  programId?: number;
  programName?: string;
  fundId?: number;
  fundName?: string;
  confidence: number;
  reasoning: string;
  vendorPattern?: string;
}

export async function suggestEnhancedMatching(
  organizationId: number,
  transactionDescription: string,
  transactionAmount: number,
  transactionType: 'income' | 'expense',
  vendorName?: string
): Promise<EnhancedMatchingSuggestion | null> {
  if (!openai) {
    console.log('[AI Enhanced Matching] AI not available - no API key configured');
    return null;
  }

  try {
    // Fetch categories, grants, programs, and funds for this organization
    const [categories, grants, programs, funds] = await Promise.all([
      storage.getCategories(organizationId),
      storage.getGrants(organizationId),
      storage.getPrograms(organizationId),
      storage.getFunds(organizationId)
    ]);

    // Build lists for AI prompt
    const relevantCategories = categories.filter(cat => cat.type === transactionType);
    const categoryList = relevantCategories.map(cat => 
      `  - ID: ${cat.id}, Name: "${cat.name}"`
    ).join('\n');

    const grantList = grants.filter(g => g.status === 'active').map(g => 
      `  - ID: ${g.id}, Name: "${g.name}", Contact: "${g.grantorContact || 'Unknown'}"`
    ).join('\n');

    const programList = programs.map(p => 
      `  - ID: ${p.id}, Name: "${p.name}", Description: "${p.description || 'No description'}"`
    ).join('\n');

    const fundList = funds.map(f => 
      `  - ID: ${f.id}, Name: "${f.name}", Type: "${f.fundType}"`
    ).join('\n');

    // Build vendor pattern context
    const vendorContext = vendorName 
      ? `\nVendor/Payee: "${vendorName}"` 
      : '';

    // Common vendor patterns for reference
    const vendorPatterns = `
Common Vendor Patterns:
- Gas stations (SHELL, CHEVRON, BP, EXXON) -> Usually Vehicle/Fuel expenses
- SAM'S CLUB, COSTCO, WALMART -> Office Supplies or Program Supplies
- AMAZON -> Office Supplies, Equipment, or Program Supplies
- STAPLES, OFFICE DEPOT -> Office Supplies
- USPS, UPS, FEDEX -> Postage/Shipping
- Hotel/Lodging -> Travel expenses
- Airlines (DELTA, UNITED, AMERICAN) -> Travel expenses
- Utility companies -> Utilities expense
- Phone/Internet providers -> Telecommunications
`;

    const prompt = `You are a nonprofit/organization financial expert. Analyze this transaction and suggest the best matches for category, grant, program, and fund.

Transaction Details:
- Description: "${transactionDescription}"${vendorContext}
- Amount: $${transactionAmount}
- Type: ${transactionType}

${vendorPatterns}

Available Categories (${transactionType}):
${categoryList || '  No categories available'}

Active Grants:
${grantList || '  No grants available'}

Programs:
${programList || '  No programs available'}

Funds:
${fundList || '  No funds available'}

Instructions:
1. Suggest the MOST appropriate category based on description and vendor patterns
2. If applicable, suggest which grant this expense/income should be linked to
3. If applicable, suggest which program this relates to
4. If applicable, suggest which fund should be used
5. Identify any vendor pattern that helped with matching
6. Provide confidence (0-100) and brief reasoning

Respond ONLY with valid JSON in this exact format:
{
  "categoryId": <number or null>,
  "categoryName": "<string or null>",
  "grantId": <number or null>,
  "grantName": "<string or null>",
  "programId": <number or null>,
  "programName": "<string or null>",
  "fundId": <number or null>,
  "fundName": "<string or null>",
  "confidence": <number 0-100>,
  "reasoning": "<brief explanation>",
  "vendorPattern": "<detected vendor pattern or null>"
}`;

    const modelName = isReplitEnvironment ? "gpt-5" : "gpt-4o";
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { 
          role: "system", 
          content: "You are a nonprofit financial expert. Always respond with valid JSON. Match transactions to appropriate categories, grants, programs, and funds." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.error('[AI Enhanced Matching] No response from AI');
      return null;
    }

    console.log(`[AI Enhanced Matching] Raw AI response for "${transactionDescription}": ${responseText}`);
    
    const suggestion = JSON.parse(responseText) as EnhancedMatchingSuggestion;
    
    // Validate suggestions against actual data
    if (suggestion.categoryId) {
      const categoryExists = relevantCategories.find(cat => cat.id === suggestion.categoryId);
      if (!categoryExists) {
        // Try to find by name
        const byName = relevantCategories.find(cat => 
          cat.name.toLowerCase() === suggestion.categoryName?.toLowerCase()
        );
        if (byName) {
          suggestion.categoryId = byName.id;
          suggestion.categoryName = byName.name;
        } else {
          suggestion.categoryId = undefined;
          suggestion.categoryName = undefined;
        }
      }
    }

    if (suggestion.grantId) {
      const grantExists = grants.find(g => g.id === suggestion.grantId);
      if (!grantExists) {
        suggestion.grantId = undefined;
        suggestion.grantName = undefined;
      }
    }

    if (suggestion.programId) {
      const programExists = programs.find(p => p.id === suggestion.programId);
      if (!programExists) {
        suggestion.programId = undefined;
        suggestion.programName = undefined;
      }
    }

    if (suggestion.fundId) {
      const fundExists = funds.find(f => f.id === suggestion.fundId);
      if (!fundExists) {
        suggestion.fundId = undefined;
        suggestion.fundName = undefined;
      }
    }

    console.log(`[AI Enhanced Matching] Suggestions: Cat=${suggestion.categoryName}, Grant=${suggestion.grantName}, Program=${suggestion.programName}, Fund=${suggestion.fundName}, Confidence=${suggestion.confidence}%`);
    
    return suggestion;
  } catch (error) {
    console.error('[AI Enhanced Matching] Error:', error);
    return null;
  }
}

// IRS Business Tax Deduction Definitions for AI reference
// Note: IRS Publication 535 was last fully revised in 2022. Current guidance is now distributed across
// Pub 334 (Small Business), Pub 463 (Travel/Gifts/Car), Pub 587 (Home Office), and IRS.gov resources.
const IRS_TAX_DEDUCTION_DEFINITIONS = `
IRS Business Tax Deduction Categories (based on IRS Publications as of 2024):

REFERENCE PUBLICATIONS:
- IRS Publication 535 (Business Expenses) - Last full revision 2022, foundational rules
- IRS Publication 334 (Tax Guide for Small Business) - Current small business guidance
- IRS Publication 463 (Travel, Gift, and Car Expenses) - Travel, meals, vehicle deductions
- IRS Publication 587 (Business Use of Your Home) - Home office deduction rules

1. FULLY DEDUCTIBLE BUSINESS EXPENSES (Pub 535, Pub 334):
   - Advertising and marketing costs
   - Bank fees and charges
   - Business insurance premiums
   - Business licenses and permits
   - Client/customer gifts (up to $25 per recipient per year - Pub 463)
   - Continuing education and professional development
   - Contract labor and subcontractor payments
   - Depreciation on business assets
   - Employee wages and salaries
   - Equipment rental and leases
   - Health insurance premiums (self-employed)
   - Interest on business loans
   - Internet and phone service (business portion)
   - Legal and professional fees
   - Maintenance and repairs
   - Office supplies and materials
   - Payroll taxes (employer portion)
   - Postage and shipping
   - Professional memberships and subscriptions
   - Rent for business premises
   - Research and development costs
   - Retirement plan contributions
   - Software and technology subscriptions
   - Utilities for business premises
   - Website hosting and domain costs

2. TRAVEL, VEHICLE & MEAL EXPENSES (Pub 463):
   - Travel expenses (airfare, lodging, transportation) - Fully deductible if business purpose
   - Vehicle expenses (business use portion) - Standard mileage rate or actual expenses
   - Meals with clients/customers - 50% deductible (was 100% temporarily 2021-2022)
   - Per diem rates for travel - Based on GSA rates for lodging and M&IE

3. HOME OFFICE EXPENSES (Pub 587):
   - Home office deduction - Regular and exclusive business use required
   - Simplified method: $5 per square foot, max 300 sq ft ($1,500 max)
   - Regular method: Percentage of home expenses (utilities, insurance, repairs, depreciation)
   - Home utilities - Only business-use percentage deductible

4. PARTIALLY DEDUCTIBLE EXPENSES:
   - Meals with clients/customers (50% deductible - Pub 463)
   - Personal vehicle used for business (mileage rate or actual expenses for business portion only)
   - Cell phone and internet (only business-use percentage)

5. NON-DEDUCTIBLE EXPENSES:
   - Personal expenses unrelated to business
   - Political contributions
   - Penalties and fines
   - Personal clothing (unless uniforms/protective gear)
   - Commuting expenses (home to regular workplace)
   - Life insurance premiums for self
   - Club memberships (social/athletic)
   - Entertainment expenses (generally not deductible after 2017 TCJA)
   - Capital expenditures (must be depreciated, not deducted in full)

6. SPECIAL CONSIDERATIONS:
   - Mixed-use expenses: Only the business portion is deductible
   - Startup costs: Up to $5,000 can be deducted in first year, remainder amortized over 180 months
   - Bad debts: Can be deducted when deemed uncollectible (specific identification method)
   - Charitable contributions: Deductible for C-corps; pass-through for other entities
   - Section 179 deduction: Immediate expensing of qualifying business assets (limits apply)
`;

export interface TaxDeductibilitySuggestion {
  categoryId: number;
  categoryName: string;
  currentlyDeductible: boolean;
  suggestedDeductible: boolean;
  confidence: number;
  irsCategory: string;
  reasoning: string;
  deductionPercentage?: number; // For partially deductible items
  irsReference?: string;
}

export interface TaxAnalysisResult {
  suggestions: TaxDeductibilitySuggestion[];
  summary: {
    totalCategories: number;
    correctlyClassified: number;
    suggestedChanges: number;
    fullyDeductible: number;
    partiallyDeductible: number;
    nonDeductible: number;
  };
  analysisDate: string;
}

// Helper function to process AI analysis response and calculate summary
function processAnalysisResponse(parsed: any, expenseCategories: any[]): TaxAnalysisResult {
  const rawSuggestions = parsed.suggestions || [];
  
  // Sanitize and validate each suggestion to ensure proper boolean values
  const suggestions: TaxDeductibilitySuggestion[] = rawSuggestions.map((s: any) => ({
    ...s,
    // Ensure boolean values - AI sometimes returns strings like "true" or other values
    currentlyDeductible: s.currentlyDeductible === true || s.currentlyDeductible === 'true',
    suggestedDeductible: s.suggestedDeductible === true || s.suggestedDeductible === 'true',
    // Ensure confidence is a number between 0-100
    confidence: typeof s.confidence === 'number' ? Math.min(100, Math.max(0, s.confidence)) : 50
  }));

  let suggestedChanges = 0;
  let fullyDeductible = 0;
  let partiallyDeductible = 0;
  let nonDeductible = 0;

  suggestions.forEach(s => {
    if (s.currentlyDeductible !== s.suggestedDeductible) {
      suggestedChanges++;
    }
    if (s.suggestedDeductible) {
      if (s.deductionPercentage && s.deductionPercentage < 100) {
        partiallyDeductible++;
      } else {
        fullyDeductible++;
      }
    } else {
      nonDeductible++;
    }
  });

  return {
    suggestions,
    summary: {
      totalCategories: expenseCategories.length,
      correctlyClassified: suggestions.length - suggestedChanges,
      suggestedChanges,
      fullyDeductible,
      partiallyDeductible,
      nonDeductible
    },
    analysisDate: new Date().toISOString()
  };
}

export async function analyzeCategoriesToTaxDeductibility(
  organizationId: number
): Promise<TaxAnalysisResult | null> {
  // Check if AI is available
  if (!openai) {
    console.log('[AI Tax Analysis] AI not available - no API key configured');
    return null;
  }

  try {
    // Get all expense categories for this organization
    const allCategories = await storage.getCategories(organizationId);
    const expenseCategories = allCategories.filter(cat => cat.type === 'expense');

    if (expenseCategories.length === 0) {
      console.log(`[AI Tax Analysis] No expense categories found for organization ${organizationId}`);
      return {
        suggestions: [],
        summary: {
          totalCategories: 0,
          correctlyClassified: 0,
          suggestedChanges: 0,
          fullyDeductible: 0,
          partiallyDeductible: 0,
          nonDeductible: 0
        },
        analysisDate: new Date().toISOString()
      };
    }

    // Build the category list for analysis
    const categoryList = expenseCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description || '',
      currentlyTaxDeductible: cat.taxDeductible
    }));

    const prompt = `You are a tax expert specializing in IRS business tax deductions. Analyze each expense category and determine if it should be marked as tax-deductible based on IRS rules.

${IRS_TAX_DEDUCTION_DEFINITIONS}

Expense Categories to Analyze:
${JSON.stringify(categoryList, null, 2)}

For each category, determine:
1. Whether it should be tax-deductible based on IRS definitions
2. Your confidence level (0-100)
3. Which IRS category it matches
4. Brief reasoning
5. If partially deductible, what percentage (e.g., 50 for meals)

IMPORTANT: Base your analysis on current IRS publications (Pub 535, Pub 334, Pub 463, Pub 587) and standard business deduction rules. Reference the specific publication when applicable.

Respond with valid JSON in this exact format:
{
  "suggestions": [
    {
      "categoryId": <number>,
      "categoryName": "<string>",
      "currentlyDeductible": <boolean>,
      "suggestedDeductible": <boolean>,
      "confidence": <number 0-100>,
      "irsCategory": "<IRS category name>",
      "reasoning": "<brief explanation>",
      "deductionPercentage": <optional number for partial deductions>,
      "irsReference": "<optional IRS publication reference>"
    }
  ]
}`;

    // Use appropriate model based on environment
    const modelName = isReplitEnvironment ? "gpt-5" : "gpt-4o";
    
    // Calculate appropriate token limit based on number of categories
    // Each category analysis needs ~100-150 tokens in the response
    const estimatedTokensNeeded = Math.max(4000, expenseCategories.length * 150 + 500);
    const maxTokens = Math.min(estimatedTokensNeeded, 16000); // Cap at 16k for safety
    
    console.log(`[AI Tax Analysis] Analyzing ${expenseCategories.length} categories with max tokens: ${maxTokens}`);
    
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { 
          role: "system", 
          content: "You are an IRS tax deduction expert. Always respond with valid JSON. Be accurate and conservative in tax deduction recommendations. For each category, provide a concise analysis." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.error('[AI Tax Analysis] No response from AI');
      return null;
    }
    
    // Check if response was truncated
    const finishReason = completion.choices[0]?.finish_reason;
    if (finishReason === 'length') {
      console.error('[AI Tax Analysis] Response was truncated due to length limit');
      // Try to salvage partial response by finding last complete JSON object
      try {
        // Find the last complete suggestion object
        const lastValidIndex = responseText.lastIndexOf('}');
        if (lastValidIndex > 0) {
          // Try to close the JSON properly
          let fixedResponse = responseText.substring(0, lastValidIndex + 1);
          // Check if we need to close the suggestions array
          if (!fixedResponse.endsWith(']}')) {
            fixedResponse = fixedResponse + ']}';
          }
          const parsed = JSON.parse(fixedResponse);
          console.log(`[AI Tax Analysis] Recovered ${parsed.suggestions?.length || 0} suggestions from truncated response`);
          return processAnalysisResponse(parsed, expenseCategories);
        }
      } catch (e) {
        console.error('[AI Tax Analysis] Could not recover from truncated response');
        return null;
      }
    }

    console.log(`[AI Tax Analysis] Received complete response for ${expenseCategories.length} categories`);
    
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[AI Tax Analysis] Failed to parse JSON response:', parseError);
      console.error('[AI Tax Analysis] Response preview:', responseText.substring(0, 500));
      return null;
    }
    
    const result = processAnalysisResponse(parsed, expenseCategories);
    console.log(`[AI Tax Analysis] Analysis complete: ${result.summary.suggestedChanges} suggested changes out of ${expenseCategories.length} categories`);
    
    return result;
  } catch (error) {
    console.error('[AI Tax Analysis] Error:', error);
    return null;
  }
}
