import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { fromBlock } from '../utils/config';
import { cachedContractCall, batchCachedContractCalls } from '../utils/cachedContractCall';
import { getPastEventsCached } from '../utils/cacheApi';
import { toFloat } from '../utils/utils';

/**
 * useAuctions — index of every auction the protocol has ever launched,
 * with normalized status, time-left and current best bid.
 *
 *   row = {
 *     id, type ('rule-buyout' | 'dfc-buyout' | 'liquidation'),
 *     lotSymbol, paymentSymbol,
 *     lotAmount, paymentAmount,         (Number, decimal)
 *     initTime: Date, lastUpdate: Date,
 *     finalized: bool,
 *     bestBidID, bestBidAmount, bestBidOwner,
 *     timeLeft: number (sec, ≤0 means claimable),
 *     nextBid: number,
 *     youAreBest: bool,
 *   }
 *
 * Per-auction bids list lives in useAuctionBids(id) — kept separate
 * because it's drawer-only data.
 */
export function useAuctions({ pollMs = 30000 } = {}) {
  const { account, contracts, web3 } = useWeb3();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    auctionTurnDuration: 0,
    minAuctionPriceMove: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const symbolOf = useCallback((addr) => {
    if (!contracts) return '';
    if (addr?.toLowerCase() === contracts.flatCoin?._address?.toLowerCase()) return 'DFC';
    if (addr?.toLowerCase() === contracts.rule?._address?.toLowerCase())     return 'RLE';
    if (addr?.toLowerCase() === contracts.weth?._address?.toLowerCase())     return 'WETH';
    return '?';
  }, [contracts]);

  const typeOf = useCallback((auction) => {
    if (!contracts) return 'liquidation';
    const lot = auction.lotToken?.toLowerCase();
    if (lot === contracts.rule?._address?.toLowerCase())     return 'dfc-buyout';   // pay DFC, receive RLE
    if (lot === contracts.flatCoin?._address?.toLowerCase()) return 'rle-buyout';   // pay RLE, receive DFC
    return 'liquidation';                                                            // pay DFC, receive WETH
  }, [contracts]);

  const load = useCallback(async () => {
    if (!web3 || !contracts?.auction) {
      setRows([]); setLoading(false);
      return;
    }
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [events, latestBlock, turnRaw, moveRaw] = await Promise.all([
        getPastEventsCached(
          contracts.auction, 'newAuction',
          { fromBlock, toBlock: 'latest' }, web3,
        ),
        web3.eth.getBlock('latest'),
        contracts.dao
          ? cachedContractCall('dao', 'params', ['auctionTurnDuration'], contracts.dao).catch(() => '0')
          : Promise.resolve('0'),
        contracts.dao
          ? cachedContractCall('dao', 'params', ['minAuctionPriceMove'], contracts.dao).catch(() => '0')
          : Promise.resolve('0'),
      ]);

      const auctionTurnDuration = Number(toFloat(turnRaw)) || 0;
      const minAuctionPriceMove = Number(toFloat(moveRaw)) || 0;
      const now = Number(latestBlock.timestamp);

      // De-dupe in case of replays.
      const seen = new Set();
      const ids = [];
      for (const ev of events) {
        const id = ev.returnValues.auctionID;
        if (!seen.has(id)) { seen.add(id); ids.push(id); }
      }

      // One round-trip: every auction's struct.
      const aucRes = ids.length
        ? await batchCachedContractCalls(
            ids.map(id => ({ contractKey: 'auction', methodName: 'auctions', args: [id] })),
          )
        : [];

      const partial = ids.map((id, i) => {
        const r = aucRes[i];
        if (!r?.success) return null;
        const a = r.result;
        return {
          id,
          raw: a,
          finalized: !!a.finalized,
          initTime: new Date(Number(a.initTime) * 1000),
          lastUpdate: new Date(Number(a.lastTimeUpdated) * 1000),
          lotToken: a.lotToken,
          paymentToken: a.paymentToken,
          lotAmount: Number(toFloat(a.lotAmount)) / 1e18,
          paymentAmount: Number(toFloat(a.paymentAmount)) / 1e18,
          bestBidID: Number(a.bestBidID) || 0,
          timeLeft: auctionTurnDuration - (now - Number(a.lastTimeUpdated)),
        };
      }).filter(Boolean);

      // Pull best-bid struct for any auction that has one (single batch).
      const withBid = partial.filter(a => a.bestBidID > 0);
      const bidRes = withBid.length
        ? await batchCachedContractCalls(
            withBid.map(a => ({ contractKey: 'auction', methodName: 'bids', args: [a.bestBidID] })),
          )
        : [];
      const bidById = {};
      withBid.forEach((a, i) => {
        const r = bidRes[i];
        if (r?.success) bidById[a.id] = r.result;
      });

      const detailed = partial.map((a) => {
        const type = typeOf(a);
        const move = type === 'dfc-buyout' ? -1 : 1;          // RLE-buyout & liquidation: bids go up; DFC-buyout: down
        const bestBid = bidById[a.id];
        const bestBidAmount = bestBid ? Number(toFloat(bestBid.bidAmount)) / 1e18 : 0;
        const nextBid = bestBid
          ? bestBidAmount * (100 + move * minAuctionPriceMove) / 100
          : 0;                                                 // first-bid floor depends on auction type — handled in form
        const youAreBest = bestBid
          && account
          && bestBid.owner?.toLowerCase() === account.toLowerCase()
          && !bestBid.canceled;

        return {
          ...a,
          type,
          lotSymbol: symbolOf(a.lotToken),
          paymentSymbol: symbolOf(a.paymentToken),
          bestBidAmount,
          bestBidOwner: bestBid?.owner ?? null,
          bestBidCanceled: !!bestBid?.canceled,
          nextBid,
          move,
          youAreBest,
        };
      });

      detailed.sort((a, b) => Number(b.id) - Number(a.id));

      if (myReq !== reqId.current) return;
      setRows(detailed);
      setStats({ auctionTurnDuration, minAuctionPriceMove });
    } catch (e) {
      console.error('useAuctions load failed', e);
      if (myReq === reqId.current) setError(e);
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [web3, contracts, account, symbolOf, typeOf]);

  useEffect(() => { load(); }, [load]);

  // Quiet poll — keeps timeLeft + bestBid current.
  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  // 1-second tick for timeLeft only (no network).
  useEffect(() => {
    if (!rows.length) return;
    const t = setInterval(() => {
      setRows(prev => prev.map(r => ({ ...r, timeLeft: r.timeLeft - 1 })));
    }, 1000);
    return () => clearInterval(t);
  }, [rows.length]);

  const totals = useMemo(() => {
    const live = rows.filter(r => !r.finalized);
    return {
      live: live.length,
      finalized: rows.length - live.length,
      claimable: live.filter(r => r.timeLeft <= 0).length,
      yours: live.filter(r => r.youAreBest).length,
    };
  }, [rows]);

  return { rows, stats, totals, loading, error, refresh: load };
}

/**
 * useAuctionBids — bid history for a single auction. One batch call.
 */
export function useAuctionBids(auctionId) {
  const { contracts, web3, account } = useWeb3();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auctionId || !contracts?.auction || !web3) {
      setBids([]); setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const events = await getPastEventsCached(
        contracts.auction, 'newBid',
        { filter: { auctionID: auctionId }, fromBlock, toBlock: 'latest' }, web3,
      );

      // Latest event per bidID
      const latest = {};
      events.sort((a, b) => b.blockNumber - a.blockNumber);
      for (const ev of events) {
        const id = ev.returnValues.bidID;
        if (!latest[id]) latest[id] = ev;
      }
      const ids = Object.keys(latest);

      const res = ids.length
        ? await batchCachedContractCalls(
            ids.map(id => ({ contractKey: 'auction', methodName: 'bids', args: [id] })),
          )
        : [];

      const out = ids.map((id, i) => {
        const r = res[i];
        if (!r?.success) return null;
        const b = r.result;
        const ev = latest[id];
        return {
          id,
          owner: b.owner,
          amount: Number(toFloat(b.bidAmount)) / 1e18,
          time: ev.blockTimestamp ? new Date(ev.blockTimestamp * 1000) : null,
          canceled: !!b.canceled,
          isYours: account && b.owner?.toLowerCase() === account.toLowerCase(),
        };
      }).filter(Boolean);

      out.sort((a, b) => Number(b.id) - Number(a.id));
      setBids(out);
    } catch (e) {
      console.error('useAuctionBids load failed', e);
    } finally {
      setLoading(false);
    }
  }, [auctionId, contracts, web3, account]);

  useEffect(() => { load(); }, [load]);

  return { bids, loading, refresh: load };
}
