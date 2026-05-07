import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PricesContext = createContext(null);

export function PricesProvider({ children }) {
  const [prices, setPrices] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const resp = await fetch('/api/prices');
      if (!resp.ok) return;
      const data = await resp.json();
      setPrices(data);
      // Pre-populate quoter module cache so class components & fallback callers benefit too
      const { setPricesCache } = await import('../utils/uniswap-quoter');
      setPricesCache(data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  return <PricesContext.Provider value={prices}>{children}</PricesContext.Provider>;
}

export const usePrices = () => useContext(PricesContext);
