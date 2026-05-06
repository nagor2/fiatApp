import { useEffect, useRef, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { cachedContractCall, cachedEthBalance } from '../utils/cachedContractCall';
import { getPastEventsCached } from '../utils/cacheApi';
import { fromBlock } from '../utils/config';
import { toFloat } from '../utils/utils';
import { contractKeyForTitle } from '../utils/contractKeys';

/* global BigInt */

/**
 * useContractStats(title) — fetches the per-contract stat block shown
 * on the legacy detail panels (DFC, RLE, CDP, Deposit, Basket).
 *
 * Returns:
 *   {
 *     loading, error,
 *     address,                       // contract address
 *     contractKey,                   // camelCase web3 key ('flatCoin' etc.)
 *     stats:  Array<{ label, value, sub?, accent? }>
 *   }
 *
 * Design notes:
 *   - Each contract type has its own loader. The hook just dispatches
 *     based on `title` and returns a shape uniform enough for the new
 *     stat-grid renderer.
 *   - Pricing helpers (`uniswap-quoter`, `pool-liquidity-direct`) are
 *     loaded *lazily* — they pull a chunk of code we don't want in the
 *     critical path of every page.
 */
export function useContractStats(title) {
  const { contracts, web3, account, ethPrice, ethPriceUniswap } = useWeb3();
  const [state, setState] = useState({ loading: true, error: null, stats: [], address: null });
  const reqId = useRef(0);

  const contractKey = contractKeyForTitle(title);
  const c = contractKey && contracts ? contracts[contractKey] : null;

  useEffect(() => {
    if (!title || !c || !web3) {
      setState({ loading: false, error: null, stats: [], address: null });
      return;
    }
    const myReq = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const result = await loadStatsByTitle(title, {
          contracts,
          web3,
          account,
          ethPrice,
          ethPriceUniswap,
        });
        if (myReq !== reqId.current) return;
        setState({
          loading: false,
          error: null,
          stats: result.stats || [],
          address: result.address || (c && c._address) || null,
        });
      } catch (err) {
        console.error(`useContractStats(${title}) failed`, err);
        if (myReq !== reqId.current) return;
        setState({ loading: false, error: err, stats: [], address: c?._address || null });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, contractKey, contracts, web3, account, ethPrice, ethPriceUniswap]);

  return { ...state, contractKey };
}

/* ─────────────────────────────── loaders ─────────────────────────────── */

async function loadStatsByTitle(title, ctx) {
  switch (title) {
    case 'DFC': return loadDfc(ctx);
    case 'RLE': return loadRle(ctx);
    case 'CDP': return loadCdp(ctx);
    case 'Deposit': return loadDeposit(ctx);
    case 'Basket': return loadBasket(ctx);
    case 'ExchangeRateContract': return loadExchangeRate(ctx);
    case 'Auction': return loadAuction(ctx);
    case 'INTDAO': return loadDao(ctx);
    default:
      return { stats: [], address: null };
  }
}

const fmt = (n, dp = 2) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
};
const fmtUsd = (n, dp = 2) => `$${fmt(n, dp)}`;

/* ── DFC ────────────────────────────────────────────────────────────── */
async function loadDfc({ contracts, web3, ethPrice, ethPriceUniswap }) {
  const fc = contracts.flatCoin;
  const cdp = contracts.cdp;
  const dao = contracts.dao;
  const basket = contracts.basket;
  const auction = contracts.auction;
  const rule = contracts.rule;
  if (!fc || !cdp || !dao || !basket || !auction) {
    return { stats: [{ label: 'Status', value: 'Loading…' }], address: fc?._address };
  }

  const cdpAddr = cdp._address;
  const auctionAddr = auction._address;

  const [supplyRaw, stubRaw, stabPctRaw, sharePxRaw, allowanceRaw, ethBalRaw] = await Promise.all([
    cachedContractCall('flatCoin', 'totalSupply', [], fc),
    cachedContractCall('flatCoin', 'balanceOf', [cdpAddr], fc),
    cachedContractCall('dao', 'params', ['stabilizationFundPercent'], dao),
    cachedContractCall('basket', 'getCurrentSharePriceChange', [], basket),
    cachedContractCall('flatCoin', 'allowance', [cdpAddr, auctionAddr], fc),
    cachedEthBalance(cdpAddr, web3),
  ]);

  const supply = toFloat(supplyRaw) / 1e18;
  const stub = toFloat(stubRaw) / 1e18;
  const stabPct = toFloat(stabPctRaw);
  const indicative = toFloat(sharePxRaw) / 1e6;
  const allowedToAuction = toFloat(allowanceRaw) / 1e18;
  const ethBal = toFloat(ethBalRaw) / 1e18;

  const ethUsd = parseFloat(ethPrice) || ethPriceUniswap || 0;
  const collateralUsd = ethBal * ethUsd;
  const collateralPct = supply > 0 && indicative > 0 ? (collateralUsd / (supply * indicative)) * 100 : 0;
  const stubDemand = supply * stabPct / 100 - stub;

  // Lazy: pricing
  let pricePool = null;
  let etherPool = null;
  let dfcPool = null;
  let tvl = null;
  if (ethPriceUniswap && ethPriceUniswap > 0) {
    try {
      const { getDfcPriceInEth } = await import('../utils/uniswap-quoter');
      const r = await getDfcPriceInEth();
      pricePool = r.priceInETH * ethPriceUniswap;
    } catch (e) { /* swallow */ }
    try {
      const { getPoolLiquidityDirect } = await import('../utils/pool-liquidity-direct');
      const p = await getPoolLiquidityDirect(ethPriceUniswap);
      if (p && p.amountETH != null) {
        etherPool = p.amountETH;
        dfcPool = p.amountDFC;
        tvl = p.tvlUSD || null;
      }
    } catch (e) { /* swallow */ }
  }

  // Transfer stats — async, non-blocking for the page so we resolve them in parallel
  const [transfers, holders] = await Promise.all([
    countTransfers(fc, web3),
    countHolders(fc, web3),
  ]);

  const stats = [
    { label: 'Total supply', value: `${fmt(supply, 2)} DFC`, accent: true },
    { label: 'Transactions', value: fmt(transfers, 0) },
    { label: 'Holders', value: fmt(holders, 0) },
    { label: 'Price (pool)', value: pricePool != null ? fmtUsd(pricePool, 4) : '—' },
    { label: 'Price (indicative)', value: fmt(indicative, 4) },
    { label: 'ETH in pool', value: etherPool != null ? `${fmt(etherPool, 4)} ETH` : '—', sub: etherPool != null && ethUsd ? fmtUsd(etherPool * ethUsd, 0) : null },
    { label: 'DFC in pool', value: dfcPool != null ? `${fmt(dfcPool, 2)} DFC` : '—', sub: dfcPool != null && pricePool ? fmtUsd(dfcPool * pricePool, 0) : null },
    { label: 'TVL in pool', value: tvl != null ? fmtUsd(tvl, 2) : '—' },
    { label: 'Overall collateral', value: fmtUsd(collateralUsd, 2), sub: `${fmt(collateralPct, 2)}% of DFC supply` },
    { label: 'Stabilization fund', value: `${fmt(stub, 2)} DFC` },
    { label: 'Stab. fund demand', value: `${fmt(stubDemand, 2)} DFC` },
    { label: 'Allowed to auction', value: `${fmt(allowedToAuction, 2)} DFC` },
  ];
  return { stats, address: fc._address };
}

/* ── RLE ────────────────────────────────────────────────────────────── */
async function loadRle({ contracts, web3, ethPriceUniswap }) {
  const r = contracts.rule;
  if (!r) return { stats: [], address: null };

  const supplyRaw = await cachedContractCall('rule', 'totalSupply', [], r);
  const supply = toFloat(supplyRaw) / 1e18;

  const [transfers, holders] = await Promise.all([
    countTransfers(r, web3, true /* return events */),
    countHolders(r, web3),
  ]);

  // Burned = sum of transfers to 0x0
  let burnedWei = BigInt(0);
  for (const ev of transfers.events || []) {
    const to = ((ev.returnValues?.to || ev.returnValues?.[1]) || '').toLowerCase();
    if (to !== '0x0000000000000000000000000000000000000000') continue;
    const v = ev.returnValues?.value ?? ev.returnValues?.[2];
    if (v == null) continue;
    try { burnedWei += BigInt(v.toString()); } catch (_) {}
  }
  const burned = Number(burnedWei) / 1e18;

  // Pool pricing
  let priceInDfc = null, priceInUsd = null, marketCap = null, poolVolume = null;
  try {
    const { getRleDfcPoolInfo, getDfcPriceInEth } = await import('../utils/uniswap-quoter');
    const [poolR, dfcR] = await Promise.allSettled([
      getRleDfcPoolInfo(r._address),
      getDfcPriceInEth(),
    ]);
    let dfcPriceInEth = null;
    if (dfcR.status === 'fulfilled') dfcPriceInEth = dfcR.value.priceInETH;
    const dfcUsd = (dfcPriceInEth && ethPriceUniswap) ? dfcPriceInEth * ethPriceUniswap : null;
    if (poolR.status === 'fulfilled') {
      priceInDfc = poolR.value.priceRleInDfc;
      if (priceInDfc && dfcUsd) {
        priceInUsd = priceInDfc * dfcUsd;
        marketCap = supply * priceInUsd;
        poolVolume = (poolR.value.amountRle * priceInUsd) + (poolR.value.amountDfc * dfcUsd);
      }
    }
  } catch (_) {}

  const stats = [
    { label: 'Total supply', value: `${fmt(supply, 2)} RLE`, accent: true },
    { label: 'Transactions', value: fmt(transfers.count, 0) },
    { label: 'Holders', value: fmt(holders, 0) },
    { label: 'Total burned', value: `${fmt(burned, 2)} RLE` },
    { label: 'Price (pool)', value: priceInDfc != null ? `${fmt(priceInDfc, 4)} DFC` : '—', sub: priceInUsd != null ? fmtUsd(priceInUsd, 4) : null },
    { label: 'Market cap', value: marketCap != null ? fmtUsd(marketCap, 2) : '—' },
    { label: 'Pool TVL', value: poolVolume != null ? fmtUsd(poolVolume, 2) : '—' },
  ];
  return { stats, address: r._address };
}

/* ── CDP ────────────────────────────────────────────────────────────── */
async function loadCdp({ contracts, web3, ethPrice }) {
  const fc = contracts.flatCoin;
  const cdp = contracts.cdp;
  const dao = contracts.dao;
  const auction = contracts.auction;
  const rule = contracts.rule;
  if (!fc || !cdp || !dao || !auction || !rule) return { stats: [], address: cdp?._address };

  const cdpAddr = cdp._address;
  const auctionAddr = auction._address;

  const [stubRaw, supplyRaw, stabPctRaw, ruleBalRaw, allowanceRaw, posCountRaw, discountRaw, irRaw, ethBalRaw] = await Promise.all([
    cachedContractCall('flatCoin', 'balanceOf', [cdpAddr], fc),
    cachedContractCall('flatCoin', 'totalSupply', [], fc),
    cachedContractCall('dao', 'params', ['stabilizationFundPercent'], dao),
    cachedContractCall('rule', 'balanceOf', [cdpAddr], rule),
    cachedContractCall('flatCoin', 'allowance', [cdpAddr, auctionAddr], fc),
    cachedContractCall('cdp', 'numPositions', [], cdp),
    cachedContractCall('dao', 'params', ['collateralDiscount'], dao),
    cachedContractCall('dao', 'params', ['interestRate'], dao),
    cachedEthBalance(cdpAddr, web3),
  ]);

  const stub = toFloat(stubRaw) / 1e18;
  const supply = toFloat(supplyRaw) / 1e18;
  const stabPct = toFloat(stabPctRaw);
  const ruleBal = toFloat(ruleBalRaw) / 1e18;
  const toAuction = toFloat(allowanceRaw) / 1e18;
  const numPositions = toFloat(posCountRaw);
  const discount = toFloat(discountRaw);
  const interestRate = toFloat(irRaw);
  const ethBal = toFloat(ethBalRaw) / 1e18;
  const ethPx = parseFloat(ethPrice) || 0;
  const exceed = stub - supply * stabPct / 100;

  // Sum fees across positions (parallel)
  let feeAccrued = 0, feeRecorded = 0;
  if (numPositions > 0) {
    const promises = [];
    for (let i = 0; i < numPositions; i++) {
      promises.push(Promise.all([
        cachedContractCall('cdp', 'positions', [i], cdp, { noCache: true }),
        cachedContractCall('cdp', 'totalCurrentFee', [i], cdp, { noCache: true }),
      ]));
    }
    const settled = await Promise.allSettled(promises);
    for (const r of settled) {
      if (r.status !== 'fulfilled') continue;
      const [pos, currentFee] = r.value;
      const recorded = pos?.interestAmountRecorded ?? pos?.[2];
      feeAccrued += Number(toFloat(currentFee)) / 1e18;
      if (recorded != null) feeRecorded += Number(toFloat(recorded)) / 1e18;
    }
  }

  // Historical CDP→Auction transfers (fees actually paid out)
  let feePaidHistorical = 0;
  try {
    const events = await getPastEventsCached(fc, 'Transfer',
      { filter: { from: cdpAddr, to: auctionAddr }, fromBlock, toBlock: 'latest' });
    const cdpLc = cdpAddr.toLowerCase();
    const auctionLc = auctionAddr.toLowerCase();
    for (const ev of events || []) {
      const rv = ev?.returnValues || ev?.args || {};
      const from = (rv.from || rv[0] || '').toLowerCase();
      const to = (rv.to || rv[1] || '').toLowerCase();
      if (from !== cdpLc || to !== auctionLc) continue;
      const v = rv.value !== undefined ? rv.value : rv[2];
      if (v == null) continue;
      feePaidHistorical += Number(toFloat(v)) / 1e18;
    }
  } catch (_) {}
  const feeEarned = feePaidHistorical + feeAccrued;

  const stats = [
    { label: 'Stab. fund (stub)', value: `${fmt(stub, 2)} DFC`, accent: true },
    { label: 'Stub fund exceed', value: `${fmt(exceed, 2)} DFC` },
    { label: 'Allowed to auction', value: `${fmt(toAuction, 2)} DFC` },
    { label: 'Total coins minted', value: `${fmt(supply, 2)} DFC` },
    { label: 'ETH balance', value: `${fmt(ethBal, 2)} ETH`, sub: ethPx ? fmtUsd(ethBal * ethPx, 2) : null },
    { label: 'RLE balance (CDP)', value: `${fmt(ruleBal, 2)} RLE` },
    { label: 'Positions count', value: fmt(numPositions, 0) },
    { label: 'Overall fee earned', value: `${fmt(feeEarned, 2)} DFC`, sub: `paid: ${fmt(feePaidHistorical, 2)} + outstanding: ${fmt(feeAccrued, 2)}` },
    { label: 'Recorded on-chain', value: `${fmt(feeRecorded, 2)} DFC` },
    { label: 'Collateral discount', value: `${discount}%` },
    { label: 'Interest rate', value: `${interestRate}%` },
  ];
  return { stats, address: cdpAddr };
}

/* ── Deposit ────────────────────────────────────────────────────────── */
async function loadDeposit({ contracts }) {
  const dep = contracts.deposit;
  const fc = contracts.flatCoin;
  const dao = contracts.dao;
  if (!dep || !fc || !dao) return { stats: [], address: dep?._address };

  const depAddr = dep._address;
  const [countRaw, balRaw, rateRaw] = await Promise.all([
    cachedContractCall('deposit', 'depositsCounter', [], dep),
    cachedContractCall('flatCoin', 'balanceOf', [depAddr], fc),
    cachedContractCall('dao', 'params', ['depositRate'], dao),
  ]);
  const count = Number(toFloat(countRaw)) || 0;
  const volume = toFloat(balRaw) / 1e18;
  const rate = toFloat(rateRaw);

  // Sum overall interest accrued (parallel)
  let interestSum = 0;
  if (count > 0) {
    const ps = [];
    for (let i = 1; i <= count; i++) {
      ps.push(cachedContractCall('deposit', 'overallInterest', [i], dep, { noCache: true }));
    }
    const settled = await Promise.allSettled(ps);
    for (const r of settled) {
      if (r.status === 'fulfilled') interestSum += Number(toFloat(r.value)) / 1e18;
    }
  }

  const stats = [
    { label: 'N of deposits', value: fmt(count, 0), accent: true },
    { label: 'Overall volume', value: `${fmt(volume, 2)} DFC` },
    { label: 'Overall interest accrued', value: `${fmt(interestSum, 4)} DFC` },
    { label: 'Interest rate', value: `${rate}%` },
  ];
  return { stats, address: depAddr };
}

/* ── Basket ─────────────────────────────────────────────────────────── */
async function loadBasket({ contracts }) {
  const b = contracts.basket;
  if (!b) return { stats: [], address: null };
  const stats = [
    { label: 'Contract', value: 'Commodity basket', accent: true },
    { label: 'See full data', value: 'on Commodities → Basket tab' },
  ];
  return { stats, address: b._address };
}

/* ── Exchange rate oracle ───────────────────────────────────────────── */
async function loadExchangeRate({ contracts }) {
  const er = contracts.exchangeRate;
  if (!er) return { stats: [], address: null };
  const stats = [
    { label: 'Contract', value: 'Exchange rate oracle', accent: true },
    { label: 'See full data', value: 'on Commodities → Index tab' },
  ];
  return { stats, address: er._address };
}

/* ── Auction ────────────────────────────────────────────────────────── */
async function loadAuction({ contracts }) {
  const a = contracts.auction;
  if (!a) return { stats: [], address: null };
  const stats = [
    { label: 'Contract', value: 'Auction house', accent: true },
    { label: 'See full data', value: 'on Auctions page' },
  ];
  return { stats, address: a._address };
}

/* ── INTDAO ─────────────────────────────────────────────────────────── */
async function loadDao({ contracts }) {
  const d = contracts.dao;
  if (!d) return { stats: [], address: null };
  const stats = [
    { label: 'Contract', value: 'Interest DAO (governance)', accent: true },
    { label: 'See full data', value: 'on Governance page' },
  ];
  return { stats, address: d._address };
}

/* ── helpers ────────────────────────────────────────────────────────── */
async function countTransfers(contract, web3, returnEvents = false) {
  try {
    const events = await getPastEventsCached(contract, 'Transfer', { fromBlock, toBlock: 'latest' });
    return returnEvents ? { count: events.length, events } : events.length;
  } catch (e) {
    return returnEvents ? { count: 0, events: [] } : 0;
  }
}

async function countHolders(contract, web3) {
  try {
    const events = await getPastEventsCached(contract, 'Transfer', { fromBlock, toBlock: 'latest' });
    const set = new Set();
    for (const ev of events || []) {
      const rv = ev.returnValues || {};
      if (rv.from) set.add(rv.from);
      if (rv.to) set.add(rv.to);
    }
    return set.size;
  } catch (e) { return 0; }
}
