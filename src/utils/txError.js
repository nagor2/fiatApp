/**
 * Normalize web3 / MetaMask transaction errors into a friendly status object.
 *
 *   { kind: 'cancelled' | 'err', msg: string }
 *
 * 'cancelled' means the user rejected/closed the wallet prompt — UI should
 * treat it as a soft reset (clear busy state, no scary red banner).
 * 'err' is anything else — show the cleaned message.
 */
export function parseTxError(err) {
  if (!err) return { kind: 'err', msg: 'Unknown error' };

  // EIP-1193 standard: 4001 = user rejected request
  const code = err.code ?? err?.data?.code ?? err?.error?.code;
  const raw = String(err.message || err.reason || err || '');

  const userRejected =
    code === 4001 ||
    code === 'ACTION_REJECTED' ||
    /user (denied|rejected|cancell?ed)/i.test(raw) ||
    /rejected by user/i.test(raw) ||
    /transaction signature/i.test(raw);

  if (userRejected) {
    return { kind: 'cancelled', msg: 'Transaction cancelled in wallet.' };
  }

  // Common failure modes — surface a short, useful sentence.
  if (/insufficient funds/i.test(raw)) {
    return { kind: 'err', msg: 'Not enough ETH to cover gas.' };
  }
  if (/nonce too low/i.test(raw)) {
    return { kind: 'err', msg: 'Wallet nonce out of sync — refresh and try again.' };
  }
  if (/replacement transaction underpriced/i.test(raw)) {
    return { kind: 'err', msg: 'A pending transaction is blocking this one. Cancel or speed it up in your wallet.' };
  }
  if (/gas required exceeds allowance|out of gas/i.test(raw)) {
    return { kind: 'err', msg: 'Transaction would run out of gas — increase the limit and retry.' };
  }
  if (/execution reverted:?\s*(.+)/i.test(raw)) {
    const reason = raw.match(/execution reverted:?\s*(.+?)(?:"|$)/i)?.[1]?.trim();
    return { kind: 'err', msg: reason ? `Reverted: ${reason}` : 'Transaction reverted by contract.' };
  }

  // Fallback — strip the noisy "Returned error:" prefix MetaMask adds.
  const cleaned = raw
    .replace(/^Returned error:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .split('\n')[0]
    .trim();
  return { kind: 'err', msg: cleaned || 'Transaction failed.' };
}
