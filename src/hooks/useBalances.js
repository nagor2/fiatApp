import { useEffect, useMemo, useRef, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { usePrices } from '../contexts/PricesContext';
import { cachedContractCall } from '../utils/cachedContractCall';
import { toFloat } from '../utils/utils';

/**
 * useBalances — single source of truth for the Balances page.
 *
 * Returns one row per token in the user's portfolio. ETH comes from
 * web3.eth.getBalance; ERC-20 tokens use cachedContractCall('balanceOf').
 *
 * Each row:
 *   {
 *     key:        stable id used for keys / routing
 *     symbol:     'DFC' | 'RLE' | 'ETH' | …
 *     name:       human label, e.g. 'DotFlat coin'
 *     balance:    Number — token units (already divided by 10**decimals)
 *     usd:        Number | null — USD value if we can price it
 *     priceUsd:   Number | null — unit price in USD
 *     iconType:   matches your existing <Product> iconType
 *     contract:   contracts[name] reference (or null for ETH)
 *     contractName: string used by Transfers/Transfer form (or null for ETH)
 *     swapHref:   external swap link if this is a swap pair, else null
 *   }
 *
 * The hook self-refreshes when account/contracts/ethPrice change, and exposes
 * a `refresh()` for manual reloads (e.g. after a transfer).
 */
export function useBalances() {
  const { account, contracts, web3, ethPrice, ethPriceUniswap } = useWeb3();
  const prices = usePrices();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const tokens = useMemo(() => ([
    { key: 'dfc', symbol: 'DFC', name: 'DotFlat coin',  contractName: 'flatCoin', iconType: 'crude' },
    { key: 'rle', symbol: 'RLE', name: 'Rule token',    contractName: 'rule',     iconType: 'crude' },
  ]), []);

  async function load() {
    if (!web3 || !account) {
      setRows([]);
      setLoading(false);
      return;
    }
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);

    try {
      // ETH first (always available)
      const ethWei = await web3.eth.getBalance(account);
      const ethBal = Number(ethWei) / 1e18;
      const ethUnitUsd = Number(ethPriceUniswap || ethPrice) || null;

      const tokenRows = await Promise.all(tokens.map(async (t) => {
        const c = contracts && contracts[t.contractName];
        if (!c) {
          return { ...t, balance: 0, usd: null, priceUsd: null, contract: null, available: false };
        }
        try {
          const raw = await cachedContractCall(t.contractName, 'balanceOf', [account], c);
          const balance = Number(toFloat(raw)) / 1e18;
          return { ...t, balance, usd: null, priceUsd: null, contract: c, available: true };
        } catch (e) {
          console.warn(`balanceOf failed for ${t.symbol}`, e);
          return { ...t, balance: 0, usd: null, priceUsd: null, contract: c, available: true, error: true };
        }
      }));

      // ── Pricing from PricesContext (one shared fetch on app start) ──
      const dfcUsd = prices?.dfcUsd ?? null;
      const rleUsd = prices?.rleUsd ?? null;

      // Patch token rows with real prices.
      const pricedTokenRows = tokenRows.map((r) => {
        if (r.symbol === 'DFC' && dfcUsd != null) {
          return { ...r, priceUsd: dfcUsd, usd: r.balance * dfcUsd };
        }
        if (r.symbol === 'RLE' && rleUsd != null) {
          return { ...r, priceUsd: rleUsd, usd: r.balance * rleUsd };
        }
        return r;
      });

      // ── No more "pair cards"; users open Uniswap from inside TradeWidget.
      const result = [
        {
          key: 'eth',
          symbol: 'ETH',
          name: 'Ether',
          balance: ethBal,
          usd: ethUnitUsd != null ? ethBal * ethUnitUsd : null,
          priceUsd: ethUnitUsd,
          iconType: 'crude',
          contract: null,
          contractName: null,
          swapHref: null,
          available: true,
          tradeable: true,    // ETH → DFC via 0x
        },
        ...pricedTokenRows.map(r => ({
          ...r,
          swapHref: null,
          tradeable: r.symbol === 'DFC' || r.symbol === 'RLE',
        })),
      ];

      if (myReq !== reqId.current) return; // stale
      setRows(result);
    } catch (e) {
      console.error('useBalances load failed', e);
      if (myReq === reqId.current) setError(e);
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, contracts, web3, ethPrice, ethPriceUniswap]);

  // Patch prices into existing rows when PricesContext updates (no balance re-fetch needed)
  useEffect(() => {
    if (!prices || rows.length === 0) return;
    setRows(prev => prev.map(r => {
      if (r.symbol === 'ETH' && prices.ethUsd != null) return { ...r, priceUsd: prices.ethUsd, usd: r.balance * prices.ethUsd };
      if (r.symbol === 'DFC' && prices.dfcUsd != null) return { ...r, priceUsd: prices.dfcUsd, usd: r.balance * prices.dfcUsd };
      if (r.symbol === 'RLE' && prices.rleUsd != null) return { ...r, priceUsd: prices.rleUsd, usd: r.balance * prices.rleUsd };
      return r;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  const totalUsd = useMemo(
    () => rows.reduce((s, r) => s + (r.usd || 0), 0),
    [rows],
  );

  return { rows, loading, error, refresh: load, totalUsd };
}
