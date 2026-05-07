import { useEffect, useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { cachedContractCall, batchCachedContractCalls } from '../utils/cachedContractCall';

/**
 * Loads basket data:
 *  - itemsCount, sharesCount
 *  - items: [{ symbol, name, share, initialPrice, balance }]
 *  - basketAddress
 */
export default function useBasket() {
  const { contracts } = useWeb3();
  const [state, setState] = useState({
    loading: true,
    error: null,
    basketAddress: '',
    itemsCount: 0,
    sharesCount: 0,
    items: [],
  });

  const load = useCallback(async () => {
    if (!contracts?.basket) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [sc, ic] = await Promise.all([
        cachedContractCall('basket', 'sharesCount', [], contracts.basket),
        cachedContractCall('basket', 'itemsCount',  [], contracts.basket),
      ]);
      const sharesCount = parseInt(sc);
      const itemsCount  = parseInt(ic);

      const ids = Array.from({ length: itemsCount }, (_, i) => i + 1);
      const calls = ids.map((id) => ({ contractKey: 'basket', methodName: 'items', args: [id], fallbackContract: contracts.basket }));
      const results = await batchCachedContractCalls(calls);
      const items = results
        .filter((r) => r.success)
        .map((r) => ({
          symbol: r.result.symbol,
          name: r.result.name,
          share: parseInt(r.result.share),
          initialPrice: parseFloat(r.result.initialPrice) / 10 ** 6,
          balance: r.result.balance,
        }));

      setState({
        loading: false,
        error: null,
        basketAddress: contracts.basket._address,
        itemsCount, sharesCount, items,
      });
    } catch (e) {
      console.error('useBasket failed:', e);
      setState((s) => ({ ...s, loading: false, error: e.message || String(e) }));
    }
  }, [contracts?.basket]);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}
