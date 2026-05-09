/* global BigInt */
/**
 * use0xSwap — quote + execute swaps via the 0x Swap API v2 (allowance-holder).
 *
 *  https://0x.org/docs/api#tag/Swap/operation/getSwapAllowanceHolderQuote
 *
 *  You will need a 0x API key. Set it in REACT_APP_ZEROEX_API_KEY (or pass
 *  via the apiKey arg). Free tier is fine for normal usage.
 *
 *  Why allowance-holder, not permit2? It's a single-tx flow (approve once
 *  to the AllowanceHolder contract, then swap), which is by far the
 *  simplest UX for a small native UI.
 */

import { useCallback, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

const ZEROEX_BASE = '/api/0x';
const CHAIN_ID = 1; // mainnet
// AllowanceHolder address (same on all chains 0x supports)
const ALLOWANCE_HOLDER = '0x0000000000001fF3684f28c67538d4D072C22734';

const ERC20_MIN_ABI = [
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint8' }] },
];

const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

function isNative(addr) {
  if (!addr) return false;
  return addr.toLowerCase() === NATIVE_ETH.toLowerCase()
      || addr === '0x0000000000000000000000000000000000000000';
}

/**
 * Hook returning { quote, swap, busy, error, lastQuote, reset }.
 *
 * quote({ sellToken, buyToken, sellAmount, taker, slippageBps })
 *   -> resolves with the parsed 0x response (price + buyAmount + …)
 *
 * swap({ sellToken, buyToken, sellAmount, taker, slippageBps })
 *   -> approves if needed, then sends the tx; resolves with the receipt.
 *
 * API key and 0x-version header are added server-side by the /api/0x proxy.
 */
export function use0xSwap() {
  const { web3, account } = useWeb3();

  const [busy, setBusy]           = useState(false);
  const [phase, setPhase]         = useState(null); // null | 'confirming'
  const [error, setError]         = useState(null);
  const [lastQuote, setLastQuote] = useState(null);

  const reset = useCallback(() => { setError(null); setLastQuote(null); }, []);

  const quote = useCallback(async ({
    sellToken, buyToken, sellAmount, buyAmount, taker, slippageBps = 100,
  }) => {
    setError(null);

    const params = new URLSearchParams({
      chainId: String(CHAIN_ID),
      sellToken,
      buyToken,
      slippageBps: String(slippageBps),
    });
    if (sellAmount) params.set('sellAmount', String(sellAmount));
    if (buyAmount)  params.set('buyAmount',  String(buyAmount));
    if (taker) params.set('taker', taker);

    const url = `${ZEROEX_BASE}/swap/allowance-holder/price?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`0x quote failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    setLastQuote(data);
    return data;
  }, []);

  const swap = useCallback(async ({
    sellToken, buyToken, sellAmount, taker, slippageBps = 100,
  }) => {
    if (!web3 || !account) throw new Error('Wallet not connected.');
    setBusy(true); setPhase(null); setError(null);
    try {
      // 1) get the firm quote (with tx data)
      const params = new URLSearchParams({
        chainId: String(CHAIN_ID),
        sellToken,
        buyToken,
        sellAmount: String(sellAmount),
        slippageBps: String(slippageBps),
        taker: taker || account,
      });
      const url = `${ZEROEX_BASE}/swap/allowance-holder/quote?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`0x firm quote failed: ${res.status} ${text}`);
      }
      const q = await res.json();

      // 2) approve the AllowanceHolder if we're selling an ERC-20 with low allowance
      if (!isNative(sellToken)) {
        const erc20 = new web3.eth.Contract(ERC20_MIN_ABI, sellToken);
        const allowance = await erc20.methods.allowance(account, ALLOWANCE_HOLDER).call();
        if (BigInt(allowance) < BigInt(sellAmount)) {
          await erc20.methods.approve(ALLOWANCE_HOLDER, sellAmount)
            .send({ from: account });
        }
      }

      // 3) send the swap tx
      const tx = q.transaction;
      const sendTx = web3.eth.sendTransaction({
        from: account,
        to: tx.to,
        data: tx.data,
        value: tx.value || '0',
        gas: tx.gas ? Math.ceil(Number(tx.gas) * 1.2) : undefined,
      });
      sendTx.on('transactionHash', () => setPhase('confirming'));
      const receipt = await sendTx;
      return { receipt, quote: q };
    } catch (e) {
      setError(e.message || String(e));
      throw e;
    } finally {
      setBusy(false); setPhase(null);
    }
  }, [web3, account]);

  return { quote, swap, busy, phase, error, lastQuote, reset };
}

export const ZEROEX_NATIVE_ETH = NATIVE_ETH;
