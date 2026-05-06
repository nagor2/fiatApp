import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { fromBlock } from '../utils/config';
import { cachedContractCall, batchCachedContractCalls } from '../utils/cachedContractCall';
import { getPastEventsCached } from '../utils/cacheApi';
import { toFloat } from '../utils/utils';

/**
 * useCredits — debt positions (CDPs) for the connected account.
 *
 * Pulls PositionOpened events filtered by owner, then `positions[id]` plus
 * live-fee `totalCurrentFee[id]` for each. Ratios and liquidation-status
 * thresholds come from the CDP/DAO contracts.
 *
 *   row = {
 *     id:                  position ID
 *     coinsMinted:         DFC outstanding (Number)
 *     ethLocked:           ETH collateral (Number)
 *     interestRecorded:    DFC of interest already booked on-chain (Number)
 *     interestAccrued:     DFC of interest currently owed (Number, ticks per block)
 *     opened:              Date
 *     updated:             Date | null
 *     liquidationStatus:   0 healthy | 1 at-risk | 2+ liquidated/closed
 *     // computed:
 *     debtTotal:           coinsMinted + interestAccrued
 *     collateralUsd:       ethLocked * ethPrice (only when ethPrice given)
 *     healthRatio:         collateralUsd / debtTotal (∞ if debt = 0)
 *   }
 */
export function useCredits({ pollFeeMs = 15000 } = {}) {
  const { account, contracts, web3, ethPrice } = useWeb3();
  const [rows, setRows]   = useState([]);
  const [stats, setStats] = useState({ interestRate: null, collateralDiscount: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const decorate = useCallback((r) => {
    const debtTotal = r.coinsMinted + r.interestAccrued;
    const ethPriceNum = Number(ethPrice) || 0;
    const collateralUsd = r.ethLocked * ethPriceNum;
    const healthRatio = debtTotal > 0 ? collateralUsd / debtTotal : Infinity;
    return { ...r, debtTotal, collateralUsd, healthRatio };
  }, [ethPrice]);

  const loadList = useCallback(async () => {
    if (!web3 || !account || !contracts?.cdp) {
      setRows([]); setLoading(false);
      return;
    }
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [events, rateRaw, discountRaw] = await Promise.all([
        getPastEventsCached(
          contracts.cdp, 'PositionOpened',
          { fromBlock, toBlock: 'latest' }, web3,
        ),
        contracts.dao
          ? cachedContractCall('dao', 'params', ['interestRate'], contracts.dao).catch(() => null)
          : Promise.resolve(null),
        contracts.dao
          ? cachedContractCall('dao', 'params', ['collateralDiscount'], contracts.dao).catch(() => null)
          : Promise.resolve(null),
      ]);

      const mine = events.filter(
        e => e.returnValues.owner.toLowerCase() === account.toLowerCase(),
      );

      // Batch all per-position reads into a single worker round-trip:
      // [pos0, fee0, pos1, fee1, ...]
      const batchCalls = mine.flatMap((ev) => {
        const id = ev.returnValues.posID;
        return [
          { contractKey: 'cdp', methodName: 'positions',       args: [id] },
          { contractKey: 'cdp', methodName: 'totalCurrentFee', args: [id] },
        ];
      });

      const batchResults = mine.length
        ? await batchCachedContractCalls(batchCalls)
        : [];

      const detailed = mine.map((ev, i) => {
        const id = ev.returnValues.posID;
        const posRes = batchResults[i * 2];
        const feeRes = batchResults[i * 2 + 1];
        const pos = posRes?.success ? posRes.result : null;
        const fee = feeRes?.success ? feeRes.result : '0';
        if (!pos) return null;
        return {
          id,
          coinsMinted:        Number(toFloat(pos.coinsMinted)) / 1e18,
          ethLocked:          Number(toFloat(pos.ethAmountLocked)) / 1e18,
          interestRecorded:   Number(toFloat(pos.interestAmountRecorded ?? pos[2] ?? 0)) / 1e18,
          interestAccrued:    Number(toFloat(fee)) / 1e18,
          opened:             pos.timeOpened ? new Date(Number(pos.timeOpened) * 1000) : null,
          updated:            pos.lastTimeUpdated ? new Date(Number(pos.lastTimeUpdated) * 1000) : null,
          liquidationStatus:  Number(pos.liquidationStatus ?? 0),
          _ethAmountLockedRaw: pos.ethAmountLocked,
        };
      }).filter(Boolean);

      // newest first, only active
      detailed.sort((a, b) => Number(b.id) - Number(a.id));

      if (myReq !== reqId.current) return;
      setRows(detailed.filter(r => r.liquidationStatus < 2).map(decorate));
      setStats({
        interestRate: rateRaw != null ? Number(toFloat(rateRaw)) : null,
        collateralDiscount: discountRaw != null ? Number(toFloat(discountRaw)) : null,
      });
    } catch (e) {
      console.error('useCredits load failed', e);
      if (myReq === reqId.current) setError(e);
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [account, contracts, web3, decorate]);

  /** Light refresh — batched re-pull of totalCurrentFee for active rows. */
  const refreshFees = useCallback(async () => {
    if (!contracts?.cdp || rows.length === 0) return;
    const calls = rows.map(r => ({
      contractKey: 'cdp', methodName: 'totalCurrentFee', args: [r.id],
    }));
    const results = await batchCachedContractCalls(calls);
    const map = {};
    rows.forEach((r, i) => {
      const res = results[i];
      map[r.id] = res?.success
        ? Number(toFloat(res.result)) / 1e18
        : r.interestAccrued;
    });
    setRows(prev => prev.map(r => decorate({ ...r, interestAccrued: map[r.id] ?? r.interestAccrued })));
  }, [rows, contracts, decorate]);

  useEffect(() => { loadList(); }, [loadList]);

  // Re-decorate when ethPrice changes (USD valuation, health ratio).
  useEffect(() => {
    setRows(prev => prev.map(decorate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethPrice]);

  // Tick the accrued fee silently — it grows per block.
  useEffect(() => {
    if (!rows.length || !pollFeeMs) return;
    const t = setInterval(refreshFees, pollFeeMs);
    return () => clearInterval(t);
  }, [rows.length, pollFeeMs, refreshFees]);

  const totals = useMemo(() => ({
    debt:        rows.reduce((s, r) => s + r.debtTotal, 0),
    minted:      rows.reduce((s, r) => s + r.coinsMinted, 0),
    accrued:     rows.reduce((s, r) => s + r.interestAccrued, 0),
    collateral:  rows.reduce((s, r) => s + r.ethLocked, 0),
    collateralUsd: rows.reduce((s, r) => s + r.collateralUsd, 0),
  }), [rows]);

  return { rows, stats, totals, loading, error, refresh: loadList };
}
