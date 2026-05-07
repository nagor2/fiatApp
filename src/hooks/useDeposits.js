import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { fromBlock } from '../utils/config';
import { cachedContractCall } from '../utils/cachedContractCall';
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

      const detailed = await Promise.all(mine.map(async (ev) => {
        const id = ev.returnValues.id;
        const [d, interest] = await Promise.all([
          cachedContractCall('deposit', 'deposits', [id], contracts.deposit),
          cachedContractCall('deposit', 'overallInterest', [id], contracts.deposit, { noCache: true })
            .catch(() => '0'),
        ]);
        return {
          id,
          coinsDeposited: Number(toFloat(d.coinsDeposited)) / 1e18,
          accumulatedInterest: Number(toFloat(interest)) / 1e18,
          opened: d.timeOpened ? new Date(Number(d.timeOpened) * 1000) : null,
          updated: d.lastTimeUpdated ? new Date(Number(d.lastTimeUpdated) * 1000) : null,
          closed: !!d.closed,
        };
      }));

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

  /** Lighter refresh: only re-pull overallInterest for known deposits. */
  const refreshInterest = useCallback(async () => {
    if (!contracts?.deposit) return;
    const updates = await Promise.all(rows.map(async (r) => {
      try {
        const i = await cachedContractCall('deposit', 'overallInterest', [r.id], contracts.deposit, { noCache: true });
        return [r.id, Number(toFloat(i)) / 1e18];
      } catch { return [r.id, r.accumulatedInterest]; }
    }));
    const map = Object.fromEntries(updates);
    setRows(prev => prev.map(r => ({ ...r, accumulatedInterest: map[r.id] ?? r.accumulatedInterest })));
  }, [rows, contracts]);

  useEffect(() => { loadList(); }, [loadList]);

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
