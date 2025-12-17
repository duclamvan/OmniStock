import OpenAI from 'openai';
import { db } from '../db';
import { suppliers, products } from '@shared/schema';
import { eq, ilike, or } from 'drizzle-orm';

export interface ParsedInvoiceItem {
  name: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  weight?: number;
  weightUnit?: string;
  dimensions?: string;
  category?: string;
  notes?: string;
  productId?: string;
}

export interface ParsedInvoiceData {
  supplierName?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  items: ParsedInvoiceItem[];
  shippingCost?: number;
  customsDuties?: number;
  totalAmount?: number;
  notes?: string;
  confidence: number;
}

const EMPTY_RESULT: ParsedInvoiceData = {
  items: [],
  confidence: 0,
  supplierName: undefined,
  currency: undefined,
  notes: undefined
};

export async function parseInvoiceImage(imageBase64: string, mimeType: string): Promise<ParsedInvoiceData> {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('DEEPSEEK_API_KEY not found in environment');
      throw new Error('AI service not configured');
    }

    const openai = new OpenAI({ 
      apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    });

    const prompt = `You are an expert at extracting data from purchase order invoices and supplier quotations. 
Analyze this invoice/quotation image and extract all relevant information.

Extract the following information:
1. Supplier Information:
   - Supplier/Company name
   - Email, phone, address if visible
   
2. Invoice Details:
   - Invoice/PO number
   - Invoice date
   - Expected delivery date (if mentioned)
   - Currency used (detect from symbols like $, €, Kč, ₫, ¥, or text like USD, EUR, CZK, VND, CNY)

3. Line Items (for each product):
   - Product name/description
   - SKU or product code (if visible)
   - Barcode (if visible)
   - Quantity
   - Unit price (in the invoice's currency)
   - Weight (if mentioned, with unit like kg, g, lb)
   - Dimensions (if mentioned)
   - Any notes or specifications

4. Additional Costs:
   - Shipping cost (if separate)
   - Customs/duties (if mentioned)
   - Total amount

5. Any notes or special instructions

Return the data in this exact JSON format:
{
  "supplierName": "string or null",
  "supplierEmail": "string or null",
  "supplierPhone": "string or null",
  "supplierAddress": "string or null",
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "expectedDeliveryDate": "YYYY-MM-DD or null",
  "currency": "USD|EUR|CZK|VND|CNY or detected currency code",
  "items": [
    {
      "name": "product name",
      "sku": "string or null",
      "barcode": "string or null",
      "quantity": number,
      "unitPrice": number,
      "weight": number or null,
      "weightUnit": "kg|g|mg|lb|oz or null",
      "dimensions": "LxWxH string or null",
      "notes": "string or null"
    }
  ],
  "shippingCost": number or null,
  "customsDuties": number or null,
  "totalAmount": number or null,
  "notes": "any general notes or null",
  "confidence": 0.0 to 1.0 (how confident you are in the extraction)
}

Be thorough but accurate. If you cannot read something clearly, use null rather than guessing.
Return ONLY the JSON object, no additional text.`;

    // EXPERIMENTAL: DeepSeek vision support
    // Note: DeepSeek-chat may not support vision in all regions/configurations
    // This feature uses multimodal format compatible with OpenAI-style vision APIs
    const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;
    
    let completion;
    try {
      // Try with vision model format (OpenAI-compatible multimodal)
      completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert invoice parser. Extract structured data from invoice images accurately. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { url: imageDataUrl, detail: 'high' }
              }
            ] as any
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });
    } catch (visionError: any) {
      // Vision format not supported - return empty result with helpful message
      console.warn('Vision format not supported:', visionError.message);
      return {
        ...EMPTY_RESULT,
        notes: 'AI vision parsing is not available. Please enter invoice data manually.',
        confidence: 0
      };
    }

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.warn('Empty response from DeepSeek AI');
      return EMPTY_RESULT;
    }

    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const parsed = JSON.parse(cleanedResponse);

    const result: ParsedInvoiceData = {
      supplierName: parsed.supplierName || undefined,
      supplierEmail: parsed.supplierEmail || undefined,
      supplierPhone: parsed.supplierPhone || undefined,
      supplierAddress: parsed.supplierAddress || undefined,
      invoiceNumber: parsed.invoiceNumber || undefined,
      invoiceDate: parsed.invoiceDate || undefined,
      expectedDeliveryDate: parsed.expectedDeliveryDate || undefined,
      currency: normalizeCurrency(parsed.currency),
      items: (parsed.items || []).map((item: any) => ({
        name: item.name || 'Unknown Item',
        sku: item.sku || undefined,
        barcode: item.barcode || undefined,
        quantity: Math.max(1, parseInt(item.quantity) || 1),
        unitPrice: parseFloat(item.unitPrice) || 0,
        weight: item.weight ? parseFloat(item.weight) : undefined,
        weightUnit: item.weightUnit || undefined,
        dimensions: item.dimensions || undefined,
        notes: item.notes || undefined
      })),
      shippingCost: parsed.shippingCost ? parseFloat(parsed.shippingCost) : undefined,
      customsDuties: parsed.customsDuties ? parseFloat(parsed.customsDuties) : undefined,
      totalAmount: parsed.totalAmount ? parseFloat(parsed.totalAmount) : undefined,
      notes: parsed.notes || undefined,
      confidence: Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5))
    };

    if (result.supplierName) {
      const matchedSupplier = await findMatchingSupplier(result.supplierName);
      if (matchedSupplier) {
        result.supplierId = matchedSupplier.id;
      }
    }

    for (const item of result.items) {
      const matchedProduct = await findMatchingProduct(item.name, item.sku, item.barcode);
      if (matchedProduct) {
        item.productId = matchedProduct.id;
        if (!item.sku && matchedProduct.sku) item.sku = matchedProduct.sku;
        if (!item.barcode && matchedProduct.barcode) item.barcode = matchedProduct.barcode;
      }
    }

    console.log(`Invoice parsed successfully with ${result.items.length} items, confidence: ${result.confidence}`);
    return result;

  } catch (error: any) {
    console.error('Invoice parsing error:', error);
    throw new Error(`Failed to parse invoice: ${error.message}`);
  }
}

function normalizeCurrency(currency: string | undefined): string {
  if (!currency) return 'USD';
  
  const normalized = currency.toUpperCase().trim();
  
  const currencyMap: Record<string, string> = {
    '$': 'USD',
    'US$': 'USD',
    'USD': 'USD',
    '€': 'EUR',
    'EUR': 'EUR',
    'EURO': 'EUR',
    'KČ': 'CZK',
    'CZK': 'CZK',
    '₫': 'VND',
    'VND': 'VND',
    '¥': 'CNY',
    'CNY': 'CNY',
    'RMB': 'CNY',
    '£': 'GBP',
    'GBP': 'GBP'
  };
  
  return currencyMap[normalized] || normalized;
}

async function findMatchingSupplier(name: string): Promise<{ id: string } | null> {
  try {
    const results = await db.select({ id: suppliers.id })
      .from(suppliers)
      .where(ilike(suppliers.name, `%${name}%`))
      .limit(1);
    
    return results[0] || null;
  } catch (error) {
    console.error('Error finding matching supplier:', error);
    return null;
  }
}

async function findMatchingProduct(name: string, sku?: string, barcode?: string): Promise<{ id: string; sku?: string | null; barcode?: string | null } | null> {
  try {
    const conditions = [];
    
    if (sku) {
      conditions.push(ilike(products.sku, sku));
    }
    if (barcode) {
      conditions.push(eq(products.barcode, barcode));
    }
    if (name) {
      conditions.push(ilike(products.name, `%${name}%`));
    }
    
    if (conditions.length === 0) return null;
    
    const results = await db.select({ 
      id: products.id, 
      sku: products.sku,
      barcode: products.barcode 
    })
      .from(products)
      .where(or(...conditions))
      .limit(1);
    
    return results[0] || null;
  } catch (error) {
    console.error('Error finding matching product:', error);
    return null;
  }
}
