import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { fromBlock } from '../utils/config';
import { cachedContractCall, batchCachedContractCalls } from '../utils/cachedContractCall';
import { getPastEventsCached } from '../utils/cacheApi';
import { toFloat } from '../utils/utils';

/**
 * Known governance-controlled parameters. Values stored in the DAO's
 * `params(string)` mapping as raw uint256s (no 1e18 scaling — these are
 * tuning constants, not token balances).
 *
 * unit:
 *   percent  — integer percent  (`stabilizationFundPercent: 8` → 8%)
 *   seconds  — integer seconds  (`auctionTurnDuration: 3600` → 1h)
 *   raw      — number, no unit
 */
export const KNOWN_PARAMS = [
  // CDP / Lending
  { name: 'interestRate',                     label: 'CDP interest rate',           unit: 'percent',
    hint: 'Annual rate accruing on outstanding DFC debt.' },
  { name: 'depositRate',                      label: 'Deposit rate',                unit: 'percent',
    hint: 'Annual rate paid to DFC depositors.' },
  { name: 'collateralDiscount',               label: 'Collateral discount',         unit: 'percent',
    hint: 'Markdown applied to collateral when calculating max borrow.' },
  { name: 'liquidationFee',                   label: 'Liquidation fee',             unit: 'percent',
    hint: 'Fee charged on collateral during liquidation.' },
  { name: 'marginCallTimeLimit',              label: 'Margin call time limit',      unit: 'seconds',
    hint: 'Time a CDP has to top up collateral before liquidation.' },
  { name: 'minCDPBalanceToInitBuyOut',        label: 'Min CDP balance for buyout',  unit: 'tokens',
    hint: 'Minimum DFC debt on a CDP to trigger a buyout auction.' },
  // Deposits
  { name: 'defaultDepositPeriod',             label: 'Default deposit period',      unit: 'seconds',
    hint: 'Lock-up duration for a standard DFC deposit.' },
  // Auctions
  { name: 'auctionTurnDuration',              label: 'Auction turn duration',       unit: 'seconds',
    hint: 'How long an auction stays open after the last action before becoming claimable.' },
  { name: 'minAuctionPriceMove',              label: 'Min auction price step',      unit: 'percent',
    hint: 'Minimum % gap between consecutive bids on any auction.' },
  // Stabilization
  { name: 'stabilizationFundPercent',         label: 'Stabilization fund',          unit: 'percent',
    hint: 'Share of liquidation proceeds reserved for the stabilization fund.' },
  { name: 'maxCoinsForStabilization',         label: 'Max coins for stabilization', unit: 'tokens',
    hint: 'Cap on DFC that can be used for stabilization in one cycle.' },
  // Governance voting
  { name: 'quorum',                           label: 'Quorum',                      unit: 'percent',
    hint: 'Minimum participation (% of pooled RLE) required for a vote to be valid.' },
  { name: 'majority',                         label: 'Majority',                    unit: 'percent',
    hint: 'Share of votes in favour required to pass a standard proposal.' },
  { name: 'absoluteMajority',                 label: 'Absolute majority',           unit: 'percent',
    hint: 'Share of all pooled RLE required to pass critical proposals.' },
  { name: 'votingDuration',                   label: 'Voting duration',             unit: 'seconds',
    hint: 'How long a voting round stays open.' },
  { name: 'minRuleTokensToInitVotingPercent', label: 'Min RLE to start vote',       unit: 'percent',
    hint: 'Minimum % of pooled RLE a member must hold to open a new vote.' },
  // Emissions & oracle
  { name: 'maxRuleEmissionPercent',           label: 'Max RLE emission',            unit: 'percent',
    hint: 'Cap on RLE that can be minted in a single buyout cycle.' },
  { name: 'highVolatilityEventBarrierPercent',label: 'High volatility barrier',     unit: 'percent',
    hint: 'Price move % that triggers a high-volatility oracle event.' },
  // Minting
  { name: 'minCoinsToMint',                   label: 'Min DFC to mint',             unit: 'raw',
    hint: 'Minimum amount of DFC (in wei) that can be minted in a single CDP operation.' },
];

/**
 * Known protocol contracts referenced by the DAO `addresses(string)` mapping.
 * Renaming any of these is a governance proposal of type "Address".
 */
export const KNOWN_ADDRESSES = [
  { name: 'rule',     label: 'RLE token',     hint: 'Governance / pool token.' },
  { name: 'flatCoin', label: 'DFC stablecoin',hint: 'Synthetic dollar; debt issued by CDPs.' },
  { name: 'cdp',      label: 'CDP',           hint: 'Collateralized debt positions.' },
  { name: 'oracle',   label: 'Oracle',        hint: 'Price feeds used for collateral math.' },
  { name: 'deposit',  label: 'Deposit',       hint: 'DFC deposits / yield engine.' },
  { name: 'basket',   label: 'Basket',        hint: 'Commodity index.' },
  { name: 'auction',  label: 'Auction',       hint: 'Dutch / English auctions for liquidations and buyouts.' },
];

/**
 * Voting types as encoded by the DAO.addVoting(votingType, ...).
 *   1 — change a uint256 parameter      (params[name] = value)
 *   2 — point a contract address        (addresses[name] = address)
 *   3 — toggle the protocol pause flag  (decision)
 *   4 — toggle the contract authorization flag (decision)
 */
export const VOTING_TYPES = {
  1: { id: 1, label: 'Parameter change', short: 'Param',     hint: 'Update a numeric governance parameter.' },
  2: { id: 2, label: 'Address change',   short: 'Address',   hint: 'Replace one of the protocol\u2019s contract addresses.' },
  3: { id: 3, label: 'Pause toggle',     short: 'Pause',     hint: 'Pause or resume the protocol.' },
  4: { id: 4, label: 'Authorize',        short: 'Authorize', hint: 'Authorize or revoke a contract\u2019s admin permission.' },
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const isZeroAddr = (a) => !a || String(a).toLowerCase() === ZERO_ADDRESS;

/**
 * usePool — DAO governance state in one pull. Mirrors the legacy Pool.js
 * data model but normalized for the redesigned page.
 *
 *   pool = {
 *     daoAddress,
 *     totalPooled, userPooled, allowed,           (Number, decimal RLE)
 *     ruleBalance,                                  (Number, decimal RLE)
 *     params:    [{ ...KNOWN_PARAM, value, display }],
 *     addresses: [{ ...KNOWN_ADDRESS, value }],
 *     activeVoting: bool,
 *     voting: null | {
 *       id, type, typeMeta, name, value, address, decision,
 *       totalPositive, startTime: Date,
 *       finalized: bool,
 *     },
 *   }
 */
export function usePool({ pollMs = 30000 } = {}) {
  const { account, contracts, web3 } = useWeb3();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!contracts?.dao || !contracts?.rule) {
      setPool(null); setLoading(false);
      return;
    }
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);

    try {
      const daoAddress = contracts.dao._address;

      // Round 1 — flat reads. Batch everything we can in one round-trip.
      const calls = [
        { contractKey: 'dao',  methodName: 'activeVoting', args: [] },
        { contractKey: 'rule', methodName: 'balanceOf',    args: [daoAddress] },
        { contractKey: 'rule', methodName: 'totalSupply',  args: [] },
      ];
      if (account) {
        calls.push(
          { contractKey: 'dao',  methodName: 'pooled',    args: [account] },
          { contractKey: 'rule', methodName: 'allowance', args: [account, daoAddress] },
        );
      }

      // Params + addresses fan-out — one big batch.
      KNOWN_PARAMS.forEach((p) => {
        calls.push({ contractKey: 'dao', methodName: 'params', args: [p.name] });
      });
      KNOWN_ADDRESSES.forEach((a) => {
        calls.push({ contractKey: 'dao', methodName: 'addresses', args: [a.name] });
      });

      const results = await batchCachedContractCalls(calls);
      const get = (i) => results[i]?.success ? results[i].result : null;

      let cur = 0;
      const isActiveVoting = !!get(cur++);
      const ruleBalance    = Number(toFloat(get(cur++) || '0')) / 1e18;
      const ruleSupply     = Number(toFloat(get(cur++) || '0')) / 1e18;
      const userPooled     = account ? Number(toFloat(get(cur++) || '0')) / 1e18 : 0;
      const allowed        = account ? Number(toFloat(get(cur++) || '0')) / 1e18 : 0;

      const params = KNOWN_PARAMS.map((p) => {
        const raw = get(cur++);
        const value = raw == null ? null : Number(toFloat(raw));
        return { ...p, value, display: formatParamValue(value, p.unit) };
      });
      const addresses = KNOWN_ADDRESSES.map((a) => {
        const value = get(cur++);
        return { ...a, value: isZeroAddr(value) ? null : value };
      });

      // Round 2 — the latest voting (1 event lookup + 1 struct read).
      const events = await getPastEventsCached(
        contracts.dao, 'NewVoting',
        { fromBlock, toBlock: 'latest' }, web3,
      );

      let voting = null;
      if (events && events.length > 0) {
        const latest = events[events.length - 1];
        const id = String(toFloat(latest.returnValues.id));
        const v = await cachedContractCall('dao', 'votings', [id], contracts.dao);
        if (v) {
          const typeNum = Number(v[1]) || Number(v.voitingType ?? v.votingType) || 0;
          const typeMeta = VOTING_TYPES[typeNum] || { id: typeNum, label: `Type ${typeNum}`, short: '?' };
          voting = {
            id,
            type: typeNum,
            typeMeta,
            totalPositive: Number(toFloat(v[0] ?? v.totalPositive ?? '0')) / 1e18,
            name:     v[2] ?? v.name ?? '',
            value:    Number(toFloat(v[3] ?? v.value ?? '0')),
            address:  v[4] ?? v.addr ?? ZERO_ADDRESS,
            startTime: new Date(Number(v[5] ?? v.startTime ?? 0) * 1000),
            decision: !!(v[6] ?? v.decision),
            finalized: !isActiveVoting,
          };
        }
      }

      const next = {
        daoAddress,
        totalPooled: ruleBalance,           // mirrors Pool.js: ruleBalanceOfDAO is the "totalPooled"
        ruleBalance,
        ruleSupply,
        userPooled,
        allowed,
        params,
        addresses,
        activeVoting: isActiveVoting,
        voting,
      };

      if (myReq !== reqId.current) return;
      setPool(next);
    } catch (e) {
      console.error('usePool load failed', e);
      if (myReq === reqId.current) setError(e);
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [contracts?.dao, account, web3]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  const stats = useMemo(() => {
    if (!pool) return null;
    const sharePct = pool.totalPooled > 0
      ? (pool.userPooled / pool.totalPooled) * 100
      : 0;
    return {
      totalPooled: pool.totalPooled,
      userPooled:  pool.userPooled,
      sharePct,
      activeVoting: pool.activeVoting,
    };
  }, [pool]);

  return { pool, stats, loading, error, refresh: load };
}

/* ── helpers ────────────────────────────────────────── */

export function formatParamValue(value, unit) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (unit === 'percent') return `${value}%`;
  if (unit === 'seconds') return formatSeconds(value);
  if (unit === 'tokens') {
    const dfc = value / 1e18;
    return `${dfc.toLocaleString(undefined, { maximumFractionDigits: 4 })} DFC`;
  }
  return value.toLocaleString();
}

export function formatSeconds(s) {
  if (!Number.isFinite(s) || s <= 0) return `${s}s`;
  const days  = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const parts = [];
  if (days)  parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins)  parts.push(`${mins}m`);
  if (!parts.length) parts.push(`${s}s`);
  return parts.join(' ');
}
