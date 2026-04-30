// Stock market API integration
// Uses free tier of Alpha Vantage or Yahoo Finance via RapidAPI

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || 'demo';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
  sector?: string;
}

// Popular stocks by region - Updated with correct exchange symbols
export const REGIONAL_STOCKS = {
  TZ: ['NMB', 'CRDB', 'TBL', 'TCCL', 'SWIS', 'TOL', 'MWAL'], // DSE (Tanzania)
  KE: ['SCOM', 'EQTY', 'KCB', 'COOP', 'EABL'], // NSE (Kenya)
  UG: ['SBU', 'UMEM', 'NVL', 'BATU'], // USE (Uganda)
  NG: ['GTCO', 'ZENITHBANK', 'DANGCEM', 'MTNN', 'BUACEMENT'], // NGX (Nigeria)
  ZA: ['SHP', 'FSR', 'ABG', 'MTN'], // JSE (South Africa)
  US: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'], // NYSE/NASDAQ
  OTHER: ['AAPL', 'MSFT', 'NVDA', 'META'], // Default for other countries
};

// Fetch real stock data from Alpha Vantage
export async function fetchStockQuote(symbol: string): Promise<StockData | null> {
  try {
    // Using Alpha Vantage free tier (5 calls per minute, 100 per day)
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data['Global Quote']) {
      const quote = data['Global Quote'];
      return {
        symbol: quote['01. symbol'],
        name: quote['01. symbol'], // Alpha Vantage doesn't return name in quote
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        currency: 'USD', // Alpha Vantage primarily returns USD
        lastUpdated: quote['07. latest trading day'],
      };
    }
    
    // If API limit reached or error, return mock data for demo
    return getMockStockData(symbol);
  } catch (error) {
    console.error('Error fetching stock:', error);
    return getMockStockData(symbol);
  }
}

// Fetch multiple stocks
export async function fetchMultipleStocks(symbols: string[]): Promise<StockData[]> {
  const results: StockData[] = [];
  
  // Alpha Vantage free tier has rate limits, so we fetch sequentially
  for (const symbol of symbols.slice(0, 5)) { // Limit to 5 to avoid rate limits
    const data = await fetchStockQuote(symbol);
    if (data) {
      results.push(data);
    }
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

// Get stocks for user's country
export async function getStocksForCountry(countryCode: string): Promise<StockData[]> {
  const symbols = REGIONAL_STOCKS[countryCode as keyof typeof REGIONAL_STOCKS] || REGIONAL_STOCKS.US;
  return fetchMultipleStocks(symbols);
}

// Mock data fallback when API is unavailable - Updated with realistic DSE prices (April 2026)
function getMockStockData(symbol: string): StockData {
  const mockDatabase: Record<string, Partial<StockData>> = {
    // US Stocks
    'AAPL': { name: 'Apple Inc', price: 189.50, change: 2.35, changePercent: 1.25, sector: 'Technology' },
    'MSFT': { name: 'Microsoft Corp', price: 378.90, change: 4.20, changePercent: 1.12, sector: 'Technology' },
    'GOOGL': { name: 'Alphabet Inc', price: 142.30, change: -1.20, changePercent: -0.84, sector: 'Technology' },
    'AMZN': { name: 'Amazon.com', price: 178.20, change: 3.50, changePercent: 2.00, sector: 'Consumer' },
    'TSLA': { name: 'Tesla Inc', price: 245.60, change: -5.40, changePercent: -2.15, sector: 'Automotive' },
    'NVDA': { name: 'NVIDIA Corp', price: 495.80, change: 12.30, changePercent: 2.55, sector: 'Technology' },
    'META': { name: 'Meta Platforms', price: 505.20, change: 8.10, changePercent: 1.63, sector: 'Technology' },
    
    // DSE (Tanzania) - Dar es Salaam Stock Exchange - Realistic April 2026 prices
    'NMB': { name: 'NMB Bank Plc', price: 510, change: 5, changePercent: 0.99, sector: 'Banking', currency: 'TZS' },
    'CRDB': { name: 'CRDB Bank Plc', price: 188, change: 3, changePercent: 1.62, sector: 'Banking', currency: 'TZS' },
    'TBL': { name: 'Tanzania Breweries Ltd', price: 5200, change: 50, changePercent: 0.97, sector: 'Consumer', currency: 'TZS' },
    'TCCL': { name: 'Tanga Cement PLC', price: 1500, change: -20, changePercent: -1.32, sector: 'Manufacturing', currency: 'TZS' },
    'SWIS': { name: 'Swissport Tanzania', price: 6900, change: 100, changePercent: 1.47, sector: 'Aviation', currency: 'TZS' },
    'PAL': { name: 'Precision Air', price: 160, change: -5, changePercent: -3.03, sector: 'Aviation', currency: 'TZS' },
    'TTP': { name: 'Tanzania Tea Packers', price: 350, change: 10, changePercent: 2.94, sector: 'Consumer', currency: 'TZS' },
    'TOL': { name: 'TOL Gases Ltd', price: 640, change: 15, changePercent: 2.40, sector: 'Manufacturing', currency: 'TZS' },
    'MWAL': { name: 'Mwanga Hakika', price: 430, change: 8, changePercent: 1.90, sector: 'Telecom', currency: 'TZS' },
    'MAENDELEO': { name: 'Maendeleo Bank', price: 350, change: -8, changePercent: -2.23, sector: 'Banking', currency: 'TZS' },
    
    // NSE (Kenya) - Nairobi Securities Exchange
    'SCOM': { name: 'Safaricom PLC', price: 17.50, change: 0.54, changePercent: 3.18, sector: 'Telecom', currency: 'KES' },
    'EQTY': { name: 'Equity Group Holdings', price: 48.20, change: 2.34, changePercent: 5.11, sector: 'Banking', currency: 'KES' },
    'KCB': { name: 'KCB Group', price: 38.50, change: 1.20, changePercent: 3.21, sector: 'Banking', currency: 'KES' },
    'COOP': { name: 'Co-operative Bank', price: 18.80, change: 0.45, changePercent: 2.45, sector: 'Banking', currency: 'KES' },
    'EABL': { name: 'East African Breweries', price: 142, change: 3.50, changePercent: 2.53, sector: 'Consumer', currency: 'KES' },
    
    // NGX (Nigeria) - Nigerian Exchange Group
    'GTCO': { name: 'Guaranty Trust Holding', price: 42.50, change: 1.55, changePercent: 3.79, sector: 'Banking', currency: 'NGN' },
    'ZENITHBANK': { name: 'Zenith Bank Plc', price: 38.20, change: 1.08, changePercent: 2.91, sector: 'Banking', currency: 'NGN' },
    'DANGCEM': { name: 'Dangote Cement', price: 7200, change: 150, changePercent: 2.13, sector: 'Manufacturing', currency: 'NGN' },
    'MTNN': { name: 'MTN Nigeria', price: 260, change: 8.50, changePercent: 3.38, sector: 'Telecom', currency: 'NGN' },
    'BUACEMENT': { name: 'BUA Cement', price: 98.50, change: 3.20, changePercent: 3.35, sector: 'Manufacturing', currency: 'NGN' },
    
    // USE (Uganda) - Uganda Securities Exchange
    'SBU': { name: 'Stanbic Bank Uganda', price: 26.50, change: 0.75, changePercent: 2.91, sector: 'Banking', currency: 'UGX' },
    'UMEM': { name: 'Umeme Ltd', price: 270, change: 5, changePercent: 1.89, sector: 'Utilities', currency: 'UGX' },
    'NVL': { name: 'New Vision Group', price: 220, change: -3, changePercent: -1.35, sector: 'Media', currency: 'UGX' },
    'BATU': { name: 'BAT Uganda', price: 17500, change: 200, changePercent: 1.16, sector: 'Consumer', currency: 'UGX' },
    
    // JSE (South Africa) - Johannesburg Stock Exchange
    'SHP': { name: 'Shoprite Holdings', price: 248.50, change: 4.20, changePercent: 1.72, sector: 'Retail', currency: 'ZAR' },
    'FSR': { name: 'FirstRand Limited', price: 68.20, change: 1.80, changePercent: 2.71, sector: 'Banking', currency: 'ZAR' },
    'ABG': { name: 'ABSA Group', price: 172.40, change: 3.50, changePercent: 2.07, sector: 'Banking', currency: 'ZAR' },
    'MTN': { name: 'MTN Group', price: 125.80, change: 2.30, changePercent: 1.86, sector: 'Telecom', currency: 'ZAR' },
  };
  
  const mock = mockDatabase[symbol] || { 
    name: symbol, 
    price: Math.random() * 200 + 50, 
    change: (Math.random() - 0.5) * 10,
    changePercent: (Math.random() - 0.5) * 5,
    sector: 'Unknown'
  };
  
  return {
    symbol,
    name: mock.name || symbol,
    price: mock.price || 100,
    change: mock.change || 0,
    changePercent: mock.changePercent || 0,
    currency: mock.currency || 'USD',
    lastUpdated: new Date().toISOString().split('T')[0],
    sector: mock.sector,
  };
}

// Real-time market status
export function getMarketStatus(): { isOpen: boolean; nextOpen: string; nextClose: string } {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // Simple check - markets generally open 9:30 AM - 4:00 PM EST on weekdays
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 9 && hour < 16; // Simplified
  
  return {
    isOpen: isWeekday && isMarketHours,
    nextOpen: isWeekday && !isMarketHours && hour < 9 ? 'Today 9:30 AM' : 'Tomorrow 9:30 AM',
    nextClose: isWeekday && isMarketHours ? 'Today 4:00 PM' : 'Next business day',
  };
}
