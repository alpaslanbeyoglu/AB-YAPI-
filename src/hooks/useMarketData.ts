import { useEffect, useState } from 'react';

const EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';
const GOLD_API = 'https://api.gold-api.com/price/XAU';

export const useMarketData = () => {
  const [data, setData] = useState({
    USD: 36.45,
    EUR: 38.20,
    GOLD: 3140.0,
    REBAR: 36200.0,
    CONCRETE: 3850.0,
    CEMENT: 215.0,
    lastUpdated: new Date(),
  });

  useEffect(() => {
    const fetchLiveMarket = async () => {
      try {
        let usdRate = 36.45;
        let eurRate = 38.20;
        let goldGram = 3140.0;

        // 1. Fetch live currency rates (USD & EUR to TRY)
        try {
          const resEx = await fetch(EXCHANGE_API);
          const jsonEx = await resEx.json();
          if (jsonEx && jsonEx.rates) {
            const tryPerUsd = jsonEx.rates.TRY;
            const eurPerUsd = jsonEx.rates.EUR;
            if (tryPerUsd) {
              usdRate = tryPerUsd;
              if (eurPerUsd) {
                eurRate = tryPerUsd / eurPerUsd;
              }
            }
          }
        } catch (e) {
          console.warn("Live exchange rate fetch error, using baseline", e);
        }

        // 2. Fetch live gold ounce & calculate gram gold in TRY
        try {
          const resGold = await fetch(GOLD_API);
          const jsonGold = await resGold.json();
          if (jsonGold && jsonGold.price) {
            const ounceUsd = jsonGold.price;
            // 1 Troy Ounce = 31.1035 grams
            goldGram = Math.round(((ounceUsd * usdRate) / 31.1035) * 10) / 10;
          }
        } catch (e) {
          goldGram = Math.round(usdRate * 86.5 * 10) / 10;
          console.warn("Live gold price fetch error, using dynamic calculation", e);
        }

        // 3. Dynamic live calculation for construction materials (Rebar/Demir & Concrete/Beton & Cement/Çimento)
        const rebarDynamic = Math.max(30000, Math.round(36200 * (usdRate / 34.0)));
        const concreteDynamic = Math.max(3200, Math.round(3850 * (usdRate / 34.0)));
        const cementDynamic = Math.max(180, Math.round(215 * (usdRate / 34.0)));

        setData({
          USD: usdRate,
          EUR: eurRate,
          GOLD: goldGram,
          REBAR: rebarDynamic,
          CONCRETE: concreteDynamic,
          CEMENT: cementDynamic,
          lastUpdated: new Date(),
        });
      } catch (error) {
        console.error('Error fetching live market data:', error);
      }
    };

    fetchLiveMarket();
    const interval = setInterval(fetchLiveMarket, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return data;
};
