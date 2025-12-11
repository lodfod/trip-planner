import supabase from "./createClient";

export interface ExchangeRateResult {
  rate: number;
  fetchedAt: Date;
  isStale: boolean;
}

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const API_BASE_URL = "https://v6.exchangerate-api.com/v6";

/**
 * Get the current JPY to USD exchange rate
 * Checks Supabase cache first, fetches from API if stale
 */
export async function getJPYtoUSDRate(): Promise<ExchangeRateResult> {
  // First, try to get from Supabase cache
  const { data: cached, error: cacheError } = await supabase
    .from("exchange_rates")
    .select("rate, fetched_at")
    .eq("base_currency", "USD")
    .eq("target_currency", "JPY")
    .single();

  // If table doesn't exist (406) or other DB error, skip to API fetch
  if (!cacheError && cached) {
    const fetchedAt = new Date(cached.fetched_at);
    const age = Date.now() - fetchedAt.getTime();
    const isStale = age > CACHE_DURATION_MS;

    if (!isStale) {
      // Cache is fresh, return it
      return {
        rate: Number(cached.rate),
        fetchedAt,
        isStale: false,
      };
    }
  }

  // Cache is stale or doesn't exist, fetch from API
  return await fetchAndCacheRate();
}

/**
 * Fetch fresh exchange rate from API and update cache
 */
async function fetchAndCacheRate(): Promise<ExchangeRateResult> {
  const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    console.warn("Exchange rate API key not configured, using fallback rate");
    return {
      rate: 150, // Fallback rate (approximate JPY per USD)
      fetchedAt: new Date(),
      isStale: true,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${apiKey}/latest/USD`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== "success") {
      throw new Error(`API error: ${data["error-type"]}`);
    }

    const jpyRate = data.conversion_rates.JPY;
    const fetchedAt = new Date();

    // Update cache in Supabase (upsert)
    const { error: upsertError } = await supabase.from("exchange_rates").upsert(
      {
        base_currency: "USD",
        target_currency: "JPY",
        rate: jpyRate,
        fetched_at: fetchedAt.toISOString(),
      },
      {
        onConflict: "base_currency,target_currency",
      }
    );

    if (upsertError) {
      console.error("Failed to cache exchange rate:", upsertError);
    }

    return {
      rate: jpyRate,
      fetchedAt,
      isStale: false,
    };
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);

    // Try to return stale cache if available (but don't fail if table doesn't exist)
    try {
      const { data: staleCache } = await supabase
        .from("exchange_rates")
        .select("rate, fetched_at")
        .eq("base_currency", "USD")
        .eq("target_currency", "JPY")
        .single();

      if (staleCache) {
        return {
          rate: Number(staleCache.rate),
          fetchedAt: new Date(staleCache.fetched_at),
          isStale: true,
        };
      }
    } catch {
      // Table doesn't exist, continue to fallback
    }

    // Ultimate fallback
    return {
      rate: 150,
      fetchedAt: new Date(),
      isStale: true,
    };
  }
}

/**
 * Convert an amount from JPY or USD to USD (base currency)
 */
export async function convertToUSD(
  amount: number,
  fromCurrency: "JPY" | "USD"
): Promise<{ amountUSD: number; rateUsed: number }> {
  if (fromCurrency === "USD") {
    return { amountUSD: amount, rateUsed: 1 };
  }

  const { rate } = await getJPYtoUSDRate();
  const amountUSD = Number((amount / rate).toFixed(2));

  return { amountUSD, rateUsed: rate };
}

/**
 * Convert an amount from USD to JPY
 */
export async function convertFromUSD(
  amountUSD: number,
  toCurrency: "JPY" | "USD"
): Promise<number> {
  if (toCurrency === "USD") {
    return amountUSD;
  }

  const { rate } = await getJPYtoUSDRate();
  return Math.round(amountUSD * rate);
}

/**
 * Format a currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: "JPY" | "USD"
): string {
  if (currency === "JPY") {
    // JPY doesn't use decimal places
    return `¥${Math.round(amount).toLocaleString()}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: "JPY" | "USD"): string {
  return currency === "JPY" ? "¥" : "$";
}
