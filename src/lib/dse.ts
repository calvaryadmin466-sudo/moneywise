// Dar es Salaam Stock Exchange (DSE) live market prices
const DSE_LIVE_PRICES_URL = "https://dse.co.tz/api/get/live/market/prices";

export interface DsePriceEntry {
  id: number;
  company: string;
  price: number;
  change: number;
}

export async function fetchDseLivePrices(): Promise<DsePriceEntry[]> {
  const res = await fetch(DSE_LIVE_PRICES_URL);
  if (!res.ok) throw new Error(`DSE prices request failed (${res.status})`);

  const json = await res.json();
  if (!json?.success || !Array.isArray(json.data)) {
    throw new Error("Unexpected DSE prices response");
  }

  return json.data;
}
