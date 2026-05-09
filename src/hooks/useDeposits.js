import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { fromBlock } from '../utils/config';
import { cachedContractCall, batchCachedContractCalls } from '../utils/cachedContractCall';
import { getPastEventsCached } from '../utils/cacheApi';
import { toFloat } from '../utils/utils';

/**
 * useDeposits — yield deposits for the connected account.
 *
 * Returns the list of *open* deposits owned by `account`, plus protocol-level
 * stats (total deposits count, current rate). Mirrors the legacy
 * MyPanel.getDeposits + DepositContract loaders.
 *
 *   row = {
 *     id:                  deposit ID
 *     coinsDeposited:      DFC principal (Number)
 *     accumulatedInterest: claimable DFC (Number, refreshes silently)
 *     opened:              Date
 *     updated:             Date | null
 *     closed:              boolean
 *   }
 */
export function useDeposits({ pollInterestMs = 20000 } = {}) {
  const { account, contracts, web3 } = useWeb3();
  const [rows, setRows]   = useState([]);
  const [stats, setStats] = useState({ totalCount: null, rate: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const loadList = useCallback(async () => {
    if (!web3 || !account || !contracts?.deposit) {
      setRows([]); setLoading(false);
      return;
    }
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [events, totalCountRaw, rateRaw] = await Promise.all([
        getPastEventsCached(
          contracts.deposit, 'DepositOpened',
          { fromBlock, toBlock: 'latest' }, web3,
        ),
        cachedContractCall('deposit', 'depositsCounter', [], contracts.deposit).catch(() => null),
        contracts.dao
          ? cachedContractCall('dao', 'params', ['depositRate'], contracts.dao).catch(() => null)
          : Promise.resolve(null),
      ]);

      const mine = events.filter(
        e => e.returnValues.owner.toLowerCase() === account.toLowerCase(),
      );

      // Batch all per-deposit reads: [deposit0, interest0, deposit1, interest1, ...]
      const batchCalls = mine.flatMap((ev) => {
        const id = ev.returnValues.id;
        return [
          { contractKey: 'deposit', methodName: 'deposits',        args: [id] },
          { contractKey: 'deposit', methodName: 'overallInterest', args: [id], noCache: true },
        ];
      });

      const batchResults = mine.length
        ? await batchCachedContractCalls(batchCalls)
        : [];

      const detailed = mine.map((ev, i) => {
        const id = ev.returnValues.id;
        const dRes = batchResults[i * 2];
        const iRes = batchResults[i * 2 + 1];
        const d = dRes?.success ? dRes.result : null;
        const interest = iRes?.success ? iRes.result : '0';
        if (!d) return null;
        return {
          id,
          coinsDeposited: Number(toFloat(d.coinsDeposited)) / 1e18,
          accumulatedInterest: Number(toFloat(interest)) / 1e18,
          opened: d.timeOpened ? new Date(Number(d.timeOpened) * 1000) : null,
          updated: d.lastTimeUpdated ? new Date(Number(d.lastTimeUpdated) * 1000) : null,
          closed: !!d.closed,
        };
      }).filter(Boolean);

      // newest first
      detailed.sort((a, b) => Number(b.id) - Number(a.id));

      if (myReq !== reqId.current) return;
      setRows(detailed.filter(r => !r.closed));
      setStats({
        totalCount: totalCountRaw != null ? Number(toFloat(totalCountRaw)) : null,
        rate: rateRaw != null ? Number(toFloat(rateRaw)) : null,
      });
    } catch (e) {
      console.error('useDeposits load failed', e);
      if (myReq === reqId.current) setError(e);
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [account, contracts?.deposit, contracts?.dao, web3]);

  /** Lighter refresh: batched re-pull of overallInterest for active deposits. */
  const refreshInterest = useCallback(async () => {
    if (!contracts?.deposit || rows.length === 0) return;
    const calls = rows.map(r => ({
      contractKey: 'deposit', methodName: 'overallInterest', args: [r.id], noCache: true,
    }));
    const results = await batchCachedContractCalls(calls);
    const map = {};
    rows.forEach((r, i) => {
      const res = results[i];
      map[r.id] = res?.success
        ? Number(toFloat(res.result)) / 1e18
        : r.accumulatedInterest;
    });
    setRows(prev => prev.map(r => ({ ...r, accumulatedInterest: map[r.id] ?? r.accumulatedInterest })));
  }, [rows, contracts]);

  useEffect(() => { loadList(); }, [loadList]);

  // Auto-refresh the full list every 30 s.
  useEffect(() => {
    if (!account || !contracts?.deposit) return;
    const t = setInterval(loadList, 30_000);
    return () => clearInterval(t);
  }, [loadList, account, contracts?.deposit]);

  // Silently keep accumulatedInterest fresh — it ticks per block.
  useEffect(() => {
    if (!rows.length || !pollInterestMs) return;
    const t = setInterval(refreshInterest, pollInterestMs);
    return () => clearInterval(t);
  }, [rows.length, pollInterestMs, refreshInterest]);

  const totals = useMemo(() => ({
    principal: rows.reduce((s, r) => s + r.coinsDeposited, 0),
    interest:  rows.reduce((s, r) => s + r.accumulatedInterest, 0),
  }), [rows]);

  return { rows, stats, totals, loading, error, refresh: loadList };
}
