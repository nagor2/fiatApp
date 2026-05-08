import React, { useEffect, useCallback, useState } from 'react';
import { getContractEvents } from '../../utils/cacheApi';
import { UNISWAP_CONFIG } from '../../utils/uniswap-config';
import Icon from './Icons';

const POOL_MANAGER = UNISWAP_CONFIG.V4.POOL_MANAGER.toLowerCase();
// ETH in Uniswap V4 is address(0), not the 0xEeee… sentinel used by 0x
const ETH_V4 = '0x0000000000000000000000000000000000000000';

const fmt = (n, dp = 4) => {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
};

const fmtAddr = (addr) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

const fmtTime = (ts) => {
  if (!ts) return null;
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Determine currency0/currency1 symbols for a V4 pool based on address ordering.
// V4 always puts the lower address as currency0.
function poolCurrencies(pair, tokens) {
  const addrA = (tokens[pair.from]?.address || '').toLowerCase();
  const addrB = (tokens[pair.to]?.address || '').toLowerCase();
  // Treat 0x Eeee… sentinel as V4 native (address(0))
  const v4A = addrA.startsWith('0xeeee') ? ETH_V4 : addrA;
  const v4B = addrB.startsWith('0xeeee') ? ETH_V4 : addrB;
  if (!v4A || !v4B) return { c0: pair.from, c1: pair.to };
  return v4A < v4B
    ? { c0: pair.from, c1: pair.to }
    : { c0: pair.to, c1: pair.from };
}

export default function PoolHistoryWidget({ pair, tokens, onClose }) {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getContractEvents(POOL_MANAGER, null, 100)
      .then((all) => {
        const poolId = pair.poolId?.toLowerCase();
        const filtered = (all || [])
          .filter((ev) => ev.returnValues?.id?.toLowerCase() === poolId)
          .sort((a, b) => b.blockNumber - a.blockNumber);
        setEvents(filtered);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Failed to load events');
        setEvents([]);
        setLoading(false);
      });
  }, [pair.poolId]);

  useEffect(() => {
    load();
  }, [load]);

  const { c0, c1 } = poolCurrencies(pair, tokens);

  return (
    <div
      className="df-drawer-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="df-drawer">
        <header className="df-drawer__head">
          <button className="df-btn df-btn--ghost df-drawer__close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
          <div className="df-drawer__title">
            <Icon name="receipt" size={20} />
            <h3>{pair.label} · History</h3>
          </div>
          <button
            className="df-btn df-btn--ghost"
            style={{ marginLeft: 'auto', padding: '6px 10px' }}
            onClick={load}
            title="Refresh"
          >
            <Icon name="refresh" size={16} />
          </button>
        </header>

        <div className="df-drawer__body">
          {loading && (
            <div className="df-empty" style={{ fontSize: 14 }}>
              <Icon name="clock" size={28} />
              Loading events…
            </div>
          )}

          {!loading && error && (
            <div className="df-empty" style={{ fontSize: 14 }}>
              <Icon name="alert" size={28} />
              {error}
            </div>
          )}

          {!loading && !error && events?.length === 0 && (
            <div className="df-empty" style={{ fontSize: 14 }}>
              <Icon name="pool" size={28} />
              No events indexed yet for this pool.
            </div>
          )}

          {!loading && !error && events?.length > 0 && (
            <div className="df-tx-list">
              {events.map((ev) => (
                <PoolEventRow
                  key={`${ev.transactionHash}-${ev.logIndex}`}
                  ev={ev}
                  c0={c0}
                  c1={c1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PoolEventRow({ ev, c0, c1 }) {
  const { event, returnValues: rv, blockTimestamp, blockNumber, transactionHash } = ev;
  const isSwap = event === 'Swap';
  const isLiq = event === 'ModifyLiquidity';

  // amounts are int128 strings — divide by 1e18 (both tokens use 18 decimals)
  const raw0 = rv?.amount0 != null ? Number(rv.amount0) / 1e18 : null;
  const raw1 = rv?.amount1 != null ? Number(rv.amount1) / 1e18 : null;

  // For Swap: the positive side is what went INTO the pool (sold by user),
  // the negative side is what came OUT (received by user).
  let sellSym, sellAmt, buySym, buyAmt;
  if (isSwap && raw0 != null && raw1 != null) {
    if (raw0 >= 0) {
      sellSym = c0; sellAmt = raw0;
      buySym  = c1; buyAmt  = Math.abs(raw1);
    } else {
      sellSym = c1; sellAmt = raw1;
      buySym  = c0; buyAmt  = Math.abs(raw0);
    }
  }

  const liqDelta = rv?.liquidityDelta != null ? Number(rv.liquidityDelta) : null;
  const isAdd = liqDelta != null && liqDelta > 0;

  const sender = rv?.sender;
  const time = blockTimestamp ? fmtTime(blockTimestamp) : null;
  const txUrl = `https://etherscan.io/tx/${transactionHash}`;

  return (
    <div className="df-tx">
      <div className={`df-tx__dir ${isAdd || (isSwap && raw0 != null && raw0 < 0) ? 'df-tx__dir--in' : 'df-tx__dir--out'}`}>
        <Icon name={isSwap ? 'swap' : 'pool'} size={14} />
      </div>

      <div className="df-tx__main">
        <div className="df-tx__title">
          {isSwap && sellSym ? (
            <>
              {fmt(sellAmt)} <span className="df-tx__sym">{sellSym}</span>
              {' → '}
              {fmt(buyAmt)} <span className="df-tx__sym">{buySym}</span>
            </>
          ) : isLiq ? (
            <>
              {isAdd ? 'Add' : 'Remove'} liquidity
              {liqDelta != null && (
                <span className="df-pool-hist__liq-delta"> ({isAdd ? '+' : '−'}{fmt(Math.abs(liqDelta), 0)})</span>
              )}
            </>
          ) : (
            event
          )}
        </div>
        <div className="df-tx__sub">
          {fmtAddr(sender)}{time ? ` · ${time}` : ` · #${blockNumber}`}
        </div>
      </div>

      {isSwap && sellAmt != null && (
        <div className="df-tx__amount df-tx__amount--out">
          {fmt(sellAmt)}{' '}
          <span className="df-tx__sym">{sellSym}</span>
        </div>
      )}

      <a className="df-tx__link" href={txUrl} target="_blank" rel="noreferrer">
        <Icon name="external" size={14} />
      </a>
    </div>
  );
}
