import OpenAI from "openai";
import { storage } from "./storage";
import type { Transaction, Bill, Vendor, Category } from "@shared/schema";

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

export interface RecurringPattern {
  vendorName: string;
  vendorId?: number;
  categoryId?: number;
  categoryName?: string;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  transactionType: 'income' | 'expense';
  transactionCount: number;
  transactions: Array<{
    id: number;
    date: string;
    amount: string;
    description: string;
  }>;
  confidence: number;
  suggestedBillName?: string;
}

export interface BudgetSuggestion {
  categoryId: number;
  categoryName: string;
  type: 'income' | 'expense';
  suggestedMonthlyAmount: number;
  basedOnAverage: number;
  basedOnMedian: number;
  variance: number;
  confidence: number;
  reasoning: string;
}

interface AIPatternResponse {
  patterns: Array<{
    vendorName: string;
    frequency: string;
    averageAmount: number;
    minAmount: number;
    maxAmount: number;
    transactionIds: number[];
    confidence: number;
    suggestedBillName: string;
  }>;
}

interface AIBudgetResponse {
  suggestions: Array<{
    categoryId: number;
    categoryName: string;
    type: 'income' | 'expense';
    suggestedMonthlyAmount: number;
    reasoning: string;
    confidence: number;
  }>;
}

export async function detectRecurringPatterns(
  organizationId: number,
  lookbackMonths: number = 6
): Promise<RecurringPattern[]> {
  try {
    const transactions = await storage.getTransactions(organizationId);
    const vendors = await storage.getVendors(organizationId);
    const categories = await storage.getCategories(organizationId);
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);
    
    const recentTransactions = transactions.filter(t => 
      new Date(t.date) >= cutoffDate
    );

    if (recentTransactions.length < 3) {
      console.log('[AI Pattern Detection] Not enough transactions for pattern detection');
      return [];
    }

    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const transactionSummary = recentTransactions.map(t => ({
      id: t.id,
      date: typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().split('T')[0],
      amount: t.amount,
      type: t.type,
      description: t.description || '',
      vendorId: t.vendorId,
      vendorName: t.vendorId ? vendorMap.get(t.vendorId)?.name || 'Unknown' : extractVendorFromDescription(t.description || ''),
      categoryId: t.categoryId,
      categoryName: t.categoryId ? categoryMap.get(t.categoryId)?.name || '' : ''
    }));

    const groupedByVendor: Record<string, typeof transactionSummary> = {};
    for (const t of transactionSummary) {
      const key = t.vendorName.toLowerCase();
      if (!groupedByVendor[key]) {
        groupedByVendor[key] = [];
      }
      groupedByVendor[key].push(t);
    }

    const potentialPatterns: typeof transactionSummary[] = [];
    for (const key of Object.keys(groupedByVendor)) {
      const vendorTransactions = groupedByVendor[key];
      if (vendorTransactions.length >= 2) {
        potentialPatterns.push(vendorTransactions);
      }
    }

    if (potentialPatterns.length === 0) {
      return [];
    }

    // Helper function for deterministic pattern detection
    const detectDeterministicPatterns = (): RecurringPattern[] => {
      const patterns: RecurringPattern[] = [];
      
      for (const group of potentialPatterns) {
        if (group.length < 2) continue;
        
        // Sort by date
        const sorted = [...group].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Calculate intervals between transactions
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const days = Math.round(
            (new Date(sorted[i].date).getTime() - new Date(sorted[i-1].date).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          intervals.push(days);
        }
        
        if (intervals.length === 0) continue;
        
        // Calculate average interval
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // Determine frequency based on average interval
        let frequency: RecurringPattern['frequency'] | null = null;
        let confidence = 0;
        
        if (avgInterval >= 5 && avgInterval <= 9) {
          frequency = 'weekly';
          confidence = 70;
        } else if (avgInterval >= 12 && avgInterval <= 16) {
          frequency = 'biweekly';
          confidence = 70;
        } else if (avgInterval >= 25 && avgInterval <= 35) {
          frequency = 'monthly';
          confidence = 80;
        } else if (avgInterval >= 80 && avgInterval <= 100) {
          frequency = 'quarterly';
          confidence = 75;
        } else if (avgInterval >= 350 && avgInterval <= 380) {
          frequency = 'yearly';
          confidence = 70;
        }
        
        if (!frequency) continue;
        
        // Calculate variance to adjust confidence
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev > avgInterval * 0.3) {
          confidence -= 20; // Reduce confidence for high variance
        }
        
        if (confidence < 60) continue;
        
        // Calculate amount stats
        const amounts = group.map(t => parseFloat(t.amount));
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);
        
        patterns.push({
          vendorName: group[0].vendorName,
          vendorId: group[0].vendorId || undefined,
          categoryId: group[0].categoryId || undefined,
          categoryName: group[0].categoryName || undefined,
          averageAmount: Math.round(avgAmount * 100) / 100,
          minAmount: Math.round(minAmount * 100) / 100,
          maxAmount: Math.round(maxAmount * 100) / 100,
          frequency,
          transactionType: group[0].type as 'income' | 'expense',
          transactionCount: group.length,
          transactions: group.map(t => ({
            id: t.id,
            date: t.date,
            amount: t.amount,
            description: t.description
          })),
          confidence,
          suggestedBillName: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} ${group[0].vendorName} Payment`
        });
      }
      
      return patterns;
    };

    // Try AI-powered detection first, fall back to deterministic
    if (!openai) {
      console.log('[AI Pattern Detection] AI not available - using deterministic detection');
      return detectDeterministicPatterns();
    }

    const patternData = potentialPatterns.slice(0, 20).map(group => ({
      vendorName: group[0].vendorName,
      transactionType: group[0].type,
      transactions: group.map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description.slice(0, 50)
      }))
    }));

    const prompt = `Analyze these transaction groups and identify RECURRING patterns.
Look for transactions that occur regularly (weekly, biweekly, monthly, quarterly, yearly).
Amount may vary slightly - that's okay for bills like utilities.

Transaction Groups:
${JSON.stringify(patternData, null, 2)}

For each group that shows a recurring pattern, respond with:
- vendorName: the vendor/company name
- frequency: 'weekly', 'biweekly', 'monthly', 'quarterly', or 'yearly'
- averageAmount: average transaction amount
- minAmount: minimum transaction amount
- maxAmount: maximum transaction amount
- transactionIds: array of transaction IDs that are part of this pattern
- confidence: 0-100 how confident you are this is recurring
- suggestedBillName: a good name for this as a bill (e.g., "Monthly Electric Bill")

Only include patterns with confidence >= 60.
Respond with JSON: {"patterns": [...]}`;

    let parsed: AIPatternResponse;
    try {
      const modelName = isReplitEnvironment ? "gpt-5" : "gpt-4o";
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { 
            role: "system", 
            content: "You are a financial pattern detection expert. Analyze transaction history to identify recurring expenses and income. Respond with valid JSON only." 
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
        console.error('[AI Pattern Detection] No response from AI, falling back to deterministic');
        return detectDeterministicPatterns();
      }

      console.log('[AI Pattern Detection] AI response:', responseText);
      parsed = JSON.parse(responseText) as AIPatternResponse;
    } catch (aiError) {
      console.error('[AI Pattern Detection] AI error, falling back to deterministic:', aiError);
      return detectDeterministicPatterns();
    }
    
    const patterns: RecurringPattern[] = [];

    for (const aiPattern of parsed.patterns || []) {
      const patternTransactions = transactionSummary.filter(t => 
        aiPattern.transactionIds.includes(t.id)
      );

      if (patternTransactions.length === 0) continue;

      const firstTx = patternTransactions[0];
      patterns.push({
        vendorName: aiPattern.vendorName,
        vendorId: firstTx.vendorId || undefined,
        categoryId: firstTx.categoryId || undefined,
        categoryName: firstTx.categoryName || undefined,
        averageAmount: aiPattern.averageAmount,
        minAmount: aiPattern.minAmount,
        maxAmount: aiPattern.maxAmount,
        frequency: aiPattern.frequency as RecurringPattern['frequency'],
        transactionType: firstTx.type as 'income' | 'expense',
        transactionCount: patternTransactions.length,
        transactions: patternTransactions.map(t => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          description: t.description
        })),
        confidence: aiPattern.confidence,
        suggestedBillName: aiPattern.suggestedBillName
      });
    }

    console.log(`[AI Pattern Detection] Found ${patterns.length} recurring patterns`);
    return patterns;

  } catch (error) {
    console.error('[AI Pattern Detection] Error:', error);
    return [];
  }
}

export async function suggestBudget(
  organizationId: number,
  lookbackMonths: number = 6
): Promise<BudgetSuggestion[]> {
  try {
    const transactions = await storage.getTransactions(organizationId);
    const categories = await storage.getCategories(organizationId);
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);
    
    const recentTransactions = transactions.filter(t => 
      new Date(t.date) >= cutoffDate && t.categoryId
    );

    if (recentTransactions.length < 5) {
      console.log('[Budget Suggestion] Not enough categorized transactions');
      return [];
    }

    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    const categoryStats = new Map<number, {
      category: typeof categories[0];
      amounts: number[];
      monthlyTotals: Map<string, number>;
    }>();

    for (const t of recentTransactions) {
      if (!t.categoryId) continue;
      
      const category = categoryMap.get(t.categoryId);
      if (!category) continue;

      if (!categoryStats.has(t.categoryId)) {
        categoryStats.set(t.categoryId, {
          category,
          amounts: [],
          monthlyTotals: new Map()
        });
      }

      const stats = categoryStats.get(t.categoryId)!;
      const amount = parseFloat(t.amount);
      stats.amounts.push(amount);

      const dateStr = typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().split('T')[0];
      const monthKey = dateStr.slice(0, 7);
      stats.monthlyTotals.set(
        monthKey, 
        (stats.monthlyTotals.get(monthKey) || 0) + amount
      );
    }

    // Helper function for deterministic budget suggestions
    const generateDeterministicSuggestions = (): BudgetSuggestion[] => {
      const suggestions: BudgetSuggestion[] = [];
      
      for (const [catId, stats] of categoryStats.entries()) {
        const monthlyValues = Array.from(stats.monthlyTotals.values());
        if (monthlyValues.length === 0) continue;
        
        const sortedValues = [...monthlyValues].sort((a, b) => a - b);
        const median = sortedValues[Math.floor(sortedValues.length / 2)];
        const average = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
        const variance = monthlyValues.length > 1
          ? Math.sqrt(monthlyValues.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / monthlyValues.length)
          : 0;
        
        // For expenses, suggest slightly above average to allow buffer
        // For income, suggest slightly below average to be conservative
        const isExpense = stats.category.type === 'expense';
        const buffer = isExpense ? 1.1 : 0.95;
        const suggestedAmount = Math.round(average * buffer * 100) / 100;
        
        // Confidence based on data consistency
        let confidence = 70;
        if (monthlyValues.length >= 4) confidence += 10;
        if (variance / average < 0.2) confidence += 10; // Low variance = more predictable
        if (variance / average > 0.5) confidence -= 20; // High variance = less predictable
        confidence = Math.max(50, Math.min(95, confidence));
        
        const reasoning = isExpense
          ? `Based on ${monthlyValues.length} months of data, average spending is $${average.toFixed(2)}. Added 10% buffer for unexpected expenses.`
          : `Based on ${monthlyValues.length} months of data, average income is $${average.toFixed(2)}. Conservative estimate at 95% of average.`;
        
        suggestions.push({
          categoryId: catId,
          categoryName: stats.category.name,
          type: stats.category.type as 'income' | 'expense',
          suggestedMonthlyAmount: suggestedAmount,
          basedOnAverage: Math.round(average * 100) / 100,
          basedOnMedian: Math.round(median * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          confidence,
          reasoning
        });
      }
      
      return suggestions.sort((a, b) => b.suggestedMonthlyAmount - a.suggestedMonthlyAmount);
    };

    const categoryData = Array.from(categoryStats.entries()).map(([catId, stats]) => {
      const monthlyValues = Array.from(stats.monthlyTotals.values());
      const avgMonthly = monthlyValues.length > 0 
        ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
        : 0;
      
      return {
        categoryId: catId,
        categoryName: stats.category.name,
        type: stats.category.type,
        transactionCount: stats.amounts.length,
        averageMonthly: Math.round(avgMonthly * 100) / 100,
        monthsWithData: monthlyValues.length
      };
    });

    if (categoryData.length === 0) {
      return [];
    }

    // Use deterministic fallback if AI not available
    if (!openai) {
      console.log('[Budget Suggestion] AI not available - using deterministic suggestions');
      return generateDeterministicSuggestions();
    }

    const prompt = `Based on this spending/income history, suggest monthly budget amounts.

Category Data (last ${lookbackMonths} months):
${JSON.stringify(categoryData, null, 2)}

For each category, suggest a reasonable monthly budget amount. Consider:
- Average spending patterns
- Seasonal variations
- Room for savings on expenses
- Conservative estimates for income

Respond with JSON:
{"suggestions": [{"categoryId": <id>, "categoryName": "<name>", "type": "income"|"expense", "suggestedMonthlyAmount": <number>, "reasoning": "<brief explanation>", "confidence": <0-100>}]}`;

    let parsed: AIBudgetResponse;
    try {
      const modelName = isReplitEnvironment ? "gpt-5" : "gpt-4o";
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { 
            role: "system", 
            content: "You are a financial planning expert. Create realistic budget suggestions based on historical data. Respond with valid JSON only." 
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
        console.error('[Budget Suggestion] No response from AI, falling back to deterministic');
        return generateDeterministicSuggestions();
      }

      console.log('[AI Budget Suggestion] AI response:', responseText);
      parsed = JSON.parse(responseText) as AIBudgetResponse;
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        console.error('[Budget Suggestion] Invalid AI response format, falling back to deterministic');
        return generateDeterministicSuggestions();
      }
    } catch (aiError) {
      console.error('[Budget Suggestion] AI error, falling back to deterministic:', aiError);
      return generateDeterministicSuggestions();
    }
    
    const suggestions: BudgetSuggestion[] = [];

    for (const aiSuggestion of parsed.suggestions || []) {
      const stats = categoryStats.get(aiSuggestion.categoryId);
      if (!stats) continue;

      const monthlyValues = Array.from(stats.monthlyTotals.values());
      const sortedValues = [...monthlyValues].sort((a, b) => a - b);
      const median = sortedValues.length > 0 
        ? sortedValues[Math.floor(sortedValues.length / 2)] 
        : 0;
      const average = monthlyValues.length > 0 
        ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
        : 0;
      const variance = monthlyValues.length > 1
        ? Math.sqrt(monthlyValues.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / monthlyValues.length)
        : 0;

      suggestions.push({
        categoryId: aiSuggestion.categoryId,
        categoryName: aiSuggestion.categoryName,
        type: aiSuggestion.type,
        suggestedMonthlyAmount: aiSuggestion.suggestedMonthlyAmount,
        basedOnAverage: Math.round(average * 100) / 100,
        basedOnMedian: Math.round(median * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        confidence: aiSuggestion.confidence,
        reasoning: aiSuggestion.reasoning
      });
    }

    console.log(`[AI Budget Suggestion] Generated ${suggestions.length} budget suggestions`);
    return suggestions;

  } catch (error) {
    console.error('[Budget Suggestion] Error:', error);
    return [];
  }
}

function extractVendorFromDescription(description: string): string {
  const cleaned = description
    .replace(/\d{4,}/g, '')
    .replace(/[#*]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleaned.split(' ').slice(0, 3);
  return words.join(' ') || 'Unknown';
}

export async function createBillFromPattern(
  organizationId: number,
  pattern: RecurringPattern,
  userId: string,
  customDayOfMonth?: number,
  fundingSource?: 'unrestricted' | 'grant',
  grantId?: number | null
): Promise<Bill | null> {
  try {
    const frequencyMap: Record<string, Bill['recurringFrequency']> = {
      'weekly': 'weekly',
      'biweekly': 'biweekly',
      'monthly': 'monthly',
      'quarterly': 'quarterly',
      'yearly': 'yearly'
    };

    let vendorId = pattern.vendorId;
    if (!vendorId) {
      const newVendor = await storage.createVendor({
        organizationId,
        name: pattern.vendorName,
        email: null,
        phone: null,
        address: null,
        notes: 'Auto-created from recurring transaction pattern'
      });
      vendorId = newVendor.id;
    }

    const nextDueDate = calculateNextDueDate(pattern.transactions, pattern.frequency, customDayOfMonth);

    const bill = await storage.createBill({
      organizationId,
      vendorId,
      billNumber: `AUTO-${Date.now()}`,
      subtotal: pattern.averageAmount.toFixed(2),
      taxAmount: '0',
      totalAmount: pattern.averageAmount.toFixed(2),
      issueDate: new Date(),
      dueDate: new Date(nextDueDate),
      status: 'draft',
      notes: `${pattern.suggestedBillName || `Recurring payment to ${pattern.vendorName}`}. Auto-generated from ${pattern.transactionCount} recurring transactions. Amount may vary between $${pattern.minAmount.toFixed(2)} and $${pattern.maxAmount.toFixed(2)}.`,
      isRecurring: true,
      recurringFrequency: frequencyMap[pattern.frequency] || 'monthly',
      recurringEndDate: null,
      fundingSource: fundingSource || 'unrestricted',
      grantId: grantId || null,
      aiSuggested: true,
      createdBy: userId
    });

    console.log(`[Pattern to Bill] Created bill ${bill.id} from pattern for ${pattern.vendorName}`);
    return bill;

  } catch (error) {
    console.error('[Pattern to Bill] Error creating bill:', error);
    return null;
  }
}

function calculateNextDueDate(
  transactions: RecurringPattern['transactions'],
  frequency: RecurringPattern['frequency'],
  customDayOfMonth?: number
): string {
  const today = new Date();
  
  if (transactions.length === 0) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (customDayOfMonth) {
      nextMonth.setDate(Math.min(customDayOfMonth, 28));
    }
    return nextMonth.toISOString().split('T')[0];
  }

  const sortedDates = transactions
    .map(t => new Date(t.date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  const lastDate = sortedDates[0];
  const nextDate = new Date(lastDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (customDayOfMonth) {
        nextDate.setDate(Math.min(customDayOfMonth, 28));
      }
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      if (customDayOfMonth) {
        nextDate.setDate(Math.min(customDayOfMonth, 28));
      }
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (customDayOfMonth) {
        nextDate.setDate(Math.min(customDayOfMonth, 28));
      }
      break;
  }

  while (nextDate < today) {
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
  }

  return nextDate.toISOString().split('T')[0];
}
