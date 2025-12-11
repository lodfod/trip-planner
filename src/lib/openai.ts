import { ParsedReceipt, Currency } from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Parse a receipt image using OpenAI GPT-4 Vision
 * @param imageBase64 - Base64 encoded image string
 * @returns Parsed receipt data
 */
export async function parseReceiptWithVision(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<ParsedReceipt> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables."
    );
  }

  const systemPrompt = `You are a receipt parser. Analyze the receipt image and extract structured data.
Return ONLY valid JSON with this exact structure:
{
  "items": [{"name": "item name", "price": 1234, "quantity": 1}],
  "subtotal": number or null,
  "tax": number or null,
  "tip": number or null,
  "total": number,
  "currency": "JPY" or "USD",
  "merchantName": "string or null",
  "date": "YYYY-MM-DD or null"
}

Important rules:
- Prices should be numbers without currency symbols
- For Japanese receipts, assume JPY unless USD/$ is explicitly shown
- If you see ¥ or 円, it's JPY
- If you see $ or USD, it's USD
- For JPY, prices are typically whole numbers (no decimals)
- Include tax and service charges if visible
- "tip" is for gratuity/service charge if separately listed
- If quantity is not shown, default to 1
- Extract the merchant/restaurant name if visible
- Extract the date if visible (format as YYYY-MM-DD)`;

  const userPrompt = `Parse this receipt image and extract all items with their prices. Return the data as JSON.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for more consistent parsing
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    // Extract JSON from the response (handle markdown code blocks)
    let jsonString = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    // Parse the JSON response
    const parsed = JSON.parse(jsonString.trim());

    // Validate and normalize the response
    const result: ParsedReceipt = {
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: { name?: string; price?: number; quantity?: number }) => ({
            name: String(item.name || "Unknown item"),
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
          }))
        : [],
      subtotal: parsed.subtotal ? Number(parsed.subtotal) : undefined,
      tax: parsed.tax ? Number(parsed.tax) : undefined,
      tip: parsed.tip ? Number(parsed.tip) : undefined,
      total: Number(parsed.total) || 0,
      currency: (parsed.currency === "USD" ? "USD" : "JPY") as Currency,
      merchantName: parsed.merchantName || undefined,
      date: parsed.date || undefined,
    };

    // If no total but we have items, calculate it
    if (result.total === 0 && result.items.length > 0) {
      result.total = result.items.reduce(
        (sum, item) => sum + item.price * (item.quantity || 1),
        0
      );
      if (result.tax) result.total += result.tax;
      if (result.tip) result.total += result.tip;
    }

    return result;
  } catch (error) {
    console.error("Receipt parsing error:", error);
    throw error;
  }
}

/**
 * Convert a File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Capture image from canvas as base64
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return dataUrl.split(",")[1];
}
