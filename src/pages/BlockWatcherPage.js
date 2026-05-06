import React, { useState, useEffect } from 'react';
import { fetchWorkerWithTimeout } from '../utils/workerCircuitBreaker';
import Icon from '../components/redesign/Icons';
import PageHead from '../components/redesign/PageHead';
import '../styles/balances.css';
import '../styles/auctions.css';
import '../styles/watcher.css';

/**
 * BlockWatcherPage — admin dashboard for the indexer worker.
 * Health pill + per-contract events/transactions browser with pagination.
 */

const rawWorkerUrl = process.env.REACT_APP_WORKERS_HEALTH_URL || '/api/worker/health';
const absoluteWorkerUrl = rawWorkerUrl.startsWith('http')
  ? rawWorkerUrl
  : (typeof window !== 'undefined' ? `${window.location.origin}${rawWorkerUrl}` : rawWorkerUrl);
const BLOCK_WATCHER_API = absoluteWorkerUrl.replace(/\/health$/, '');
const TIMEOUT = 5000;

const KNOWN_METHODS = {
  '0xa9059cbb': 'Transfer', '0x23b872dd': 'Transfer From', '0x095ea7b3': 'Approve',
  '0x40c10f19': 'Mint', '0x42966c68': 'Burn', '0xd0e30db0': 'Deposit',
  '0x2e1a7d4d': 'Withdraw', '0x3ccfd60b': 'Withdraw',
  '0xad7a9784': 'Update Single Price', '0x506e4d9a': 'Update Several Prices',
  '0x1249c58b': 'Open Position', '0xfcfff16f': 'Close Position',
  '0x8a19c8bc': 'Liquidate', '0x47e7ef24': 'Deposit',
  '0x454a2ab3': 'Place Bid', '0x91f90157': 'Settle Auction',
};

const decodeMethod = (input) => {
  if (!input || input === '0x' || input.length < 10) return 'Transfer';
  return KNOWN_METHODS[input.slice(0, 10)] || input.slice(0, 10);
};

const fmtTs = (ts) => ts ? new Date(ts).toLocaleString() : '—';
const fmtUptime = (ms) => {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return `${d}d ${h % 24}h`;
  if (h) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
};
const short = (a) => a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '—';

const fetchBlockTs = async (blockNum) => {
  try {
    const res = await fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'eth_getBlockByNumber',
        params: [`0x${Number(blockNum).toString(16)}`, false], id: 1,
      }),
    });
    const data = await res.json();
    const ts = data.result?.timestamp;
    return ts ? parseInt(ts, 16) : null;
  } catch { return null; }
};

const fmtAge = (ts) => {
  if (!ts) return null;
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 0)    return 'just now';
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export default function BlockWatcherPage() {
  const [health, setHealth] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [txs, setTxs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pages, setPages] = useState({ events: null, txs: null });
  const [loading, setLoading] = useState(false);
  const [blockTs, setBlockTs] = useState({ network: null, processed: null });
  const [, setTick] = useState(0);

  // Re-render every second so "N seconds ago" stays live
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch on-chain timestamps whenever block numbers change
  useEffect(() => {
    const net = health?.lastNetworkBlock;
    const proc = health?.lastProcessedBlock;
    if (!net && !proc) return;
    let cancelled = false;
    (async () => {
      const [netTs, procTs] = await Promise.all([
        net  ? fetchBlockTs(net)  : Promise.resolve(null),
        proc ? fetchBlockTs(proc) : Promise.resolve(null),
      ]);
      if (!cancelled) setBlockTs({ network: netTs, processed: procTs });
    })();
    return () => { cancelled = true; };
  }, [health?.lastNetworkBlock, health?.lastProcessedBlock]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const r = await fetchWorkerWithTimeout(`${BLOCK_WATCHER_API}/health`, {}, TIMEOUT);
        setHealth(await r.json());
      } catch (e) { setHealth({ status: 'error', error: e.message }); }
    };
    const fetchContracts = async () => {
      try {
        const r = await fetchWorkerWithTimeout(`${BLOCK_WATCHER_API}/api/contracts`, {}, TIMEOUT);
        const d = await r.json();
        setContracts(d.contracts || []);
        if (d.contracts?.length) setSelected(d.contracts[0].address);
      } catch (e) { /* */ }
    };
    fetchHealth(); fetchContracts();
    const t = setInterval(fetchHealth, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setPage(1); }, [selected, tab]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const url = tab === 'events'
          ? `${BLOCK_WATCHER_API}/api/events/${selected}?page=${page}&limit=${limit}`
          : `${BLOCK_WATCHER_API}/api/transactions/${selected}?page=${page}&limit=${limit}`;
        const r = await fetchWorkerWithTimeout(url, {}, TIMEOUT);
        const d = await r.json();
        if (cancelled) return;
        if (tab === 'events') {
          setEvents(d.events || []);
          setPages((p) => ({ ...p, events: d.pagination || null }));
        } else {
          setTxs(d.transactions || []);
          setPages((p) => ({ ...p, txs: d.pagination || null }));
        }
      } catch (e) { /* */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [selected, tab, page, limit]);

  const statusTone = health?.status === 'healthy' ? 'positive'
                    : health?.status === 'degraded' ? 'warning'
                    : health?.status === 'error' ? 'negative' : 'muted';

  const pagination = tab === 'events' ? pages.events : pages.txs;

  return (
    <div className="df-page">
      <PageHead
        title="Block"
        accent="watcher"
        sub="Live health and indexed activity from the protocol's worker. Use this to debug events, transactions, and oracle updates across all DotFlat contracts."
      />

      <section className="df-watcher-health">
        <div className="df-watcher-health__head">
          <h3>Worker status</h3>
          {health && <span className={`df-pill df-pill--${statusTone}`}>{health.status?.toUpperCase()}</span>}
        </div>
        {health ? (
          <dl className="df-watcher-health__grid">
            <div><dt>Uptime</dt><dd>{fmtUptime(health.uptime)}</dd></div>
            <div><dt>Watched contracts</dt><dd>{health.watchedAddressesCount ?? '—'}</dd></div>
            <div><dt>Transactions indexed</dt><dd>{(health.transactionsIndexed ?? 0).toLocaleString()}</dd></div>
            <div><dt>Events indexed</dt><dd>{(health.eventsIndexed ?? 0).toLocaleString()}</dd></div>

            <div><dt>Network block</dt><dd>
              {health.lastNetworkBlock ?? '—'}
              {blockTs.network && <span className="df-faint" style={{ marginLeft: 6 }}>({fmtAge(blockTs.network)})</span>}
            </dd></div>
            <div><dt>Network block time</dt><dd>{health.lastNetworkBlockTime ? fmtTs(health.lastNetworkBlockTime) : '—'}</dd></div>

            <div><dt>Processed block</dt><dd>
              {health.lastProcessedBlock ?? '—'}
              {blockTs.processed && <span className="df-faint" style={{ marginLeft: 6 }}>({fmtAge(blockTs.processed)})</span>}
            </dd></div>

            {health.lastRelevantBlock != null && (
              <div><dt>Last relevant block</dt><dd>
                {health.lastRelevantBlock}
                {health.lastRelevantBlockTime && (
                  <span className="df-faint" style={{ marginLeft: 6 }}>
                    · {fmtTs(health.lastRelevantBlockTime)}
                  </span>
                )}
              </dd></div>
            )}

            {health.staleFor && (
              <div><dt>Stale for</dt><dd><span className="df-pill df-pill--warning">{health.staleFor}</span></dd></div>
            )}

            {health.cache && (
              <>
                <div><dt>Cache hit rate</dt><dd><span className="df-pill df-pill--positive">{health.cache.hitRate}</span></dd></div>
                <div><dt>Cache hits / misses</dt><dd>{health.cache.hits?.toLocaleString()} / {health.cache.misses?.toLocaleString()}</dd></div>
              </>
            )}
          </dl>
        ) : <p className="df-muted">Loading worker status…</p>}
      </section>

      <section className="df-watcher-controls">
        <label className="df-field">
          <span>Contract</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {contracts.map((c) => (
              <option key={c.address} value={c.address}>{c.name} — {short(c.address)}</option>
            ))}
          </select>
        </label>

        <div className="df-watcher-tabs" role="tablist">
          <button role="tab" className={tab === 'events' ? 'is-on' : ''} onClick={() => setTab('events')}>
            Events {pages.events ? `(${pages.events.total})` : ''}
          </button>
          <button role="tab" className={tab === 'txs' ? 'is-on' : ''} onClick={() => setTab('txs')}>
            Transactions {pages.txs ? `(${pages.txs.total})` : ''}
          </button>
        </div>
      </section>

      <section className="df-watcher-table">
        {loading && <p className="df-muted">Loading…</p>}
        {tab === 'events' && !loading && (
          events.length ? (
            <table className="df-table">
              <thead><tr><th>Event</th><th>Block</th><th>Time</th><th>Tx</th><th>Values</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={`${e.transactionHash}-${e.logIndex}`}>
                    <td><strong className="df-accent">{e.event}</strong></td>
                    <td className="df-mono">{e.blockNumber}</td>
                    <td className="df-faint">{fmtTs(e.blockTimestamp * 1000)}</td>
                    <td><a className="df-link df-mono" href={`https://etherscan.io/tx/${e.transactionHash}`} target="_blank" rel="noreferrer">{short(e.transactionHash)}</a></td>
                    <td><details><summary>Show</summary><pre className="df-pre">{JSON.stringify(e.returnValues, null, 2)}</pre></details></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="df-muted">No events.</p>
        )}
        {tab === 'txs' && !loading && (
          txs.length ? (
            <table className="df-table">
              <thead><tr><th>Hash</th><th>Method</th><th>Block</th><th>From</th><th>To</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                {txs.map((tx) => (
                  <tr key={tx.hash}>
                    <td><a className="df-link df-mono" href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer">{short(tx.hash)}</a></td>
                    <td><strong>{tx.method || decodeMethod(tx.input)}</strong></td>
                    <td className="df-mono">{tx.blockNumber}</td>
                    <td className="df-mono df-faint">{tx.from ? short(tx.from) : '—'}</td>
                    <td className="df-mono df-faint">{tx.to ? short(tx.to) : 'create'}</td>
                    <td>{tx.value ? (parseInt(tx.value) / 1e18).toFixed(4) : '0'} ETH</td>
                    <td><span className={`df-pill df-pill--${tx.isError === '0' ? 'positive' : 'negative'}`}>{tx.isError === '0' ? 'OK' : 'Failed'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="df-muted">No transactions.</p>
        )}
      </section>

      {pagination?.totalPages > 1 && (
        <nav className="df-pagination">
          <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button onClick={() => setPage(1)} disabled={page === 1}>« First</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
          <span className="df-mono">{page} / {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>Next ›</button>
          <button onClick={() => setPage(pagination.totalPages)} disabled={page === pagination.totalPages}>Last »</button>
        </nav>
      )}
    </div>
  );
}
