import OpenAI from 'openai';
import type { Product } from '@shared/schema';

interface WeightDimensionResult {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  confidence: number;
}

const FALLBACK_ESTIMATES: WeightDimensionResult = {
  weightKg: 0.15,
  lengthCm: 15,
  widthCm: 10,
  heightCm: 5,
  confidence: 0.3
};

export async function inferProductWeightDimensions(product: Product): Promise<WeightDimensionResult> {
  try {
    if (!product) {
      console.warn('No product provided for weight/dimension inference');
      return FALLBACK_ESTIMATES;
    }

    const existingWeight = product.unitWeightKg || product.weight;
    const existingLength = product.unitLengthCm || product.length;
    const existingWidth = product.unitWidthCm || product.width;
    const existingHeight = product.unitHeightCm || product.height;

    if (existingWeight && existingLength && existingWidth && existingHeight) {
      return {
        weightKg: parseFloat(existingWeight.toString()),
        lengthCm: parseFloat(existingLength.toString()),
        widthCm: parseFloat(existingWidth.toString()),
        heightCm: parseFloat(existingHeight.toString()),
        confidence: 1.0
      };
    }

    // Use DeepSeek API for AI inference
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('DEEPSEEK_API_KEY not found in environment, using fallback estimates');
      return FALLBACK_ESTIMATES;
    }

    // DeepSeek API is OpenAI-compatible
    const openai = new OpenAI({ 
      apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    });

    const categoryInfo = product.categoryId ? ` in category ${product.categoryId}` : '';
    const descriptionInfo = product.description ? `\nDescription: ${product.description}` : '';

    const prompt = `You are a logistics expert specializing in B2B nail salon supplies. Based on the product information below, estimate the physical properties of a single unit.

Product Name: ${product.name}${categoryInfo}${descriptionInfo}

Context:
- This is for a B2B nail salon supply business
- Products range from very small items (nail files, nail tips, small bottles) to larger items (salon furniture, UV lamps, storage units)
- Small items like nail files typically weigh 10-50g and measure around 10x2x0.5 cm
- Bottles of nail polish typically weigh 15-30g and measure around 3x3x7 cm
- UV/LED lamps typically weigh 300-800g and measure around 25x20x12 cm
- Salon furniture can weigh 5-20kg and measure 50x40x80 cm or larger

Please provide realistic estimates for this product's physical properties in the following JSON format:
{
  "weightKg": <decimal number in kilograms>,
  "lengthCm": <decimal number in centimeters>,
  "widthCm": <decimal number in centimeters>,
  "heightCm": <decimal number in centimeters>,
  "confidence": <decimal from 0 to 1, where 1 is very confident>
}

Base your confidence on:
- How specific the product name is (higher confidence for specific names)
- Whether you can identify the exact product type (higher confidence)
- Standard sizes for this type of product in the nail salon industry

Return ONLY the JSON object, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a logistics expert providing accurate physical property estimates for nail salon products. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      console.warn('Empty response from DeepSeek AI, using fallback estimates');
      return FALLBACK_ESTIMATES;
    }

    const result = JSON.parse(responseText);

    if (!result.weightKg || !result.lengthCm || !result.widthCm || !result.heightCm) {
      console.warn('Incomplete response from DeepSeek AI, using fallback estimates');
      return FALLBACK_ESTIMATES;
    }

    const inferredResult: WeightDimensionResult = {
      weightKg: Math.max(0.001, Math.min(100, parseFloat(result.weightKg))),
      lengthCm: Math.max(0.5, Math.min(200, parseFloat(result.lengthCm))),
      widthCm: Math.max(0.5, Math.min(200, parseFloat(result.widthCm))),
      heightCm: Math.max(0.5, Math.min(200, parseFloat(result.heightCm))),
      confidence: Math.max(0, Math.min(1, parseFloat(result.confidence || 0.5)))
    };

    console.log(`AI inference for product "${product.name}":`, inferredResult);
    return inferredResult;

  } catch (error) {
    console.error('Error inferring product weight/dimensions:', error);
    return FALLBACK_ESTIMATES;
  }
}
