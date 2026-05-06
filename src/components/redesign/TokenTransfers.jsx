import React, { useEffect, useMemo, useState } from 'react';
import { fromBlock } from '../../utils/config';
import { dateFromTimestamp, toFloat } from '../../utils/utils';
import { getPastEventsCached } from '../../utils/cacheApi';
import { cachedContractCall } from '../../utils/cachedContractCall';
import Icon from './Icons';

/**
 * Clean Transfers list + transfer form for a single ERC-20 token.
 * Replaces the legacy <Transfers /> markup with token-aware styling that
 * fits the redesigned drawer.
 */
export default function TokenTransfers({ web3, contracts, contractName, account, symbol }) {
  const contract = contracts && contracts[contractName];
  const [txs, setTxs] = useState(null); // null = loading
  const [balance, setBalance] = useState(null);
  const [page, setPage] = useState(0);
  const perPage = 8;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!contract || !account || !web3) return;
      setTxs(null);
      try {
        const [fromEvents, toEvents, bal] = await Promise.all([
          getPastEventsCached(contract, 'Transfer', { filter: { from: account }, fromBlock }, web3),
          getPastEventsCached(contract, 'Transfer', { filter: { to: account },   fromBlock }, web3),
          cachedContractCall(contractName, 'balanceOf', [account], contract),
        ]);
        if (cancelled) return;
        const all = [...fromEvents, ...toEvents]
          .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
        setTxs(all);
        setBalance(Number(toFloat(bal)) / 1e18);
      } catch (e) {
        console.error('TokenTransfers load failed', e);
        if (!cancelled) setTxs([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [contract, account, web3, contractName]);

  const pageItems = useMemo(() => {
    if (!txs) return [];
    return txs.slice(page * perPage, page * perPage + perPage);
  }, [txs, page]);

  const totalPages = txs ? Math.max(1, Math.ceil(txs.length / perPage)) : 1;

  return (
    <div className="df-transfers">
      <TransferForm
        web3={web3}
        contract={contract}
        account={account}
        symbol={symbol}
        balance={balance}
      />

      <div className="df-transfers__head">
        <h4>Activity</h4>
        {txs && <span className="df-muted df-mono df-sm">{txs.length} events</span>}
      </div>

      {txs === null && <div className="df-loading df-loading--inline">Loading transfers…</div>}
      {txs && txs.length === 0 && (
        <div className="df-empty df-empty--inline">
          <p>No transfers yet for this token.</p>
        </div>
      )}

      {txs && txs.length > 0 && (
        <ul className="df-tx-list">
          {pageItems.map(ev => {
            const incoming = ev.returnValues.to.toLowerCase() === account.toLowerCase();
            const counter = incoming ? ev.returnValues.from : ev.returnValues.to;
            const amount = (Number(toFloat(ev.returnValues.value)) / 1e18);
            return (
              <li key={ev.id} className="df-tx">
                <span className={`df-tx__dir df-tx__dir--${incoming ? 'in' : 'out'}`}>
                  <Icon name={incoming ? 'arrow-down-left' : 'arrow-up-right'} size={16} />
                </span>
                <div className="df-tx__main">
                  <div className="df-tx__title">
                    {incoming ? 'Received from' : 'Sent to'}{' '}
                    <span className="df-mono">{shorten(counter)}</span>
                  </div>
                  <div className="df-tx__sub df-mono df-sm">
                    {ev.blockTimestamp ? dateFromTimestamp(ev.blockTimestamp) : `block ${ev.blockNumber}`}
                  </div>
                </div>
                <div className={`df-tx__amount df-tx__amount--${incoming ? 'in' : 'out'}`}>
                  {incoming ? '+' : '−'}{amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  <span className="df-tx__sym"> {symbol}</span>
                </div>
                {ev.transactionHash && (
                  <a
                    href={`https://etherscan.io/tx/${ev.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="df-tx__link"
                    aria-label="View on Etherscan"
                  >
                    <Icon name="external" size={14} />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {txs && txs.length > perPage && (
        <div className="df-pager">
          <button className="df-btn df-btn--ghost df-btn--sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>← Newer</button>
          <span className="df-muted df-sm">{page + 1} / {totalPages}</span>
          <button className="df-btn df-btn--ghost df-btn--sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>Older →</button>
        </div>
      )}
    </div>
  );
}

function TransferForm({ web3, contract, account, symbol, balance }) {
  const [address, setAddress] = useState('');
  const [amount, setAmount]   = useState('');
  const [busy, setBusy]       = useState(false);
  const [status, setStatus]   = useState(null); // {kind:'ok'|'err'|'pending', msg:string}

  const valid = web3 && contract && account
    && /^0x[a-fA-F0-9]{40}$/.test(address.trim())
    && Number(amount) > 0
    && (balance == null || Number(amount) <= balance);

  const fillMax = () => { if (balance != null) setAmount(String(balance)); };

  function send() {
    if (!valid) return;
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Awaiting wallet confirmation…' });
    contract.methods
      .transfer(address.trim(), web3.utils.toWei(String(amount)))
      .send({ from: account })
      .on('transactionHash', (hash) => setStatus({ kind: 'pending', msg: `Sent · ${shorten(hash)}` }))
      .on('receipt', () => setStatus({ kind: 'ok', msg: 'Confirmed' }))
      .on('confirmation', () => { setBusy(false); })
      .on('error', (err) => { setBusy(false); setStatus({ kind: 'err', msg: err.message || 'Failed' }); });
  }

  return (
    <div className="df-form">
      <div className="df-form__head">
        <h4>Send {symbol}</h4>
        {balance != null && (
          <button className="df-link" type="button" onClick={fillMax}>
            Balance: {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {symbol}
          </button>
        )}
      </div>
      <div className="df-field">
        <label>Recipient address</label>
        <input
          type="text"
          spellCheck="false"
          autoComplete="off"
          placeholder="0x…"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
      </div>
      <div className="df-field">
        <label>Amount</label>
        <div className="df-field__amount">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0.0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <span className="df-field__unit">{symbol}</span>
        </div>
      </div>
      {status && (
        <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>
      )}
      <button
        className="df-btn df-btn--primary df-btn--block"
        onClick={send}
        disabled={!valid || busy}
      >
        {busy ? 'Sending…' : <><Icon name="send" size={16} /> Send {symbol}</>}
      </button>
    </div>
  );
}

function shorten(s) {
  if (!s) return '';
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}
