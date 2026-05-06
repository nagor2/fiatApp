/**
 * Maps the user-facing `title` from config.contractsList to the
 * camelCase key used in Web3Context's `contracts` map.
 *
 * config.contractsList: title='DFC',  name='Dotflat coin'      → contracts.flatCoin
 * config.contractsList: title='CDP',  name='Collateral...'      → contracts.cdp
 * config.contractsList: title='RLE',  name='Rule token'         → contracts.rule
 * etc.
 */
export const CONTRACT_KEY_BY_TITLE = {
  DFC: 'flatCoin',
  RLE: 'rule',
  CDP: 'cdp',
  Deposit: 'deposit',
  Auction: 'auction',
  INTDAO: 'dao',
  Basket: 'basket',
  ExchangeRateContract: 'exchangeRate',
};

export function contractKeyForTitle(title) {
  if (!title) return null;
  if (CONTRACT_KEY_BY_TITLE[title]) return CONTRACT_KEY_BY_TITLE[title];
  // Fallbacks for case-variants
  const t = String(title);
  for (const [k, v] of Object.entries(CONTRACT_KEY_BY_TITLE)) {
    if (k.toLowerCase() === t.toLowerCase()) return v;
  }
  return null;
}
