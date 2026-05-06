import { useEffect, useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { batchCachedContractCalls } from '../utils/cachedContractCall';
import { getContractTransactions } from '../utils/cacheApi';

/**
 * Loads oracle + basket data and returns:
 *  - instruments  (array, includes synthetic 'DFC' + 'ETH' + commodities)
 *  - priceHistory (array of { date, time, timestamp, blockNumber, DFC, ETH, <symbol>, <symbol>_original, ... })
 *  - instrumentsCount, oracleAddress
 *  - loading, error
 *  - reload()
 *
 * Mirrors ExchangeRateContract.js exactly — DO NOT change the math.
 */
export default function useExchangeRate() {
  const { contracts, web3 } = useWeb3();

  const [state, setState] = useState({
    loading: true,
    error: null,
    oracleAddress: '',
    instrumentsCount: 0,
    instruments: [],
    priceHistory: [],
  });

  const load = useCallback(async () => {
    if (!contracts?.oracle || !contracts?.basket || !web3) return;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const oracleAddress = contracts.oracle._address;

      // Wave 1: counts
      const wave1 = await batchCachedContractCalls([
        { contractKey: 'oracle', methodName: 'instrumentsCount', args: [], fallbackContract: contracts.oracle },
        { contractKey: 'basket', methodName: 'itemsCount',       args: [], fallbackContract: contracts.basket },
        { contractKey: 'basket', methodName: 'sharesCount',      args: [], fallbackContract: contracts.basket },
      ]);
      const instrumentsCount = parseInt(wave1[0].success ? wave1[0].result : 0);
      const basketItemsCount = parseInt(wave1[1].success ? wave1[1].result : 0);
      const totalShares      = parseInt(wave1[2].success ? wave1[2].result : 0);

      // Wave 2: basket items
      const itemIds = Array.from({ length: basketItemsCount }, (_, i) => i + 1);
      const wave2 = await batchCachedContractCalls(
        itemIds.map((id) => ({ contractKey: 'basket', methodName: 'items', args: [id], fallbackContract: contracts.basket }))
      );
      const basketItems = [];
      wave2.forEach((r, i) => {
        if (!r.success) { console.warn(`Failed to load basket item ${itemIds[i]}:`, r.error); return; }
        basketItems.push({
          symbol: r.result.symbol,
          share: parseInt(r.result.share),
          initialPrice: parseFloat(r.result.initialPrice) / 10 ** 6,
        });
      });

      // Wave 3: dictionary lookups
      const wave3 = await batchCachedContractCalls(
        basketItems.map((item) => ({ contractKey: 'oracle', methodName: 'dictionary', args: [item.symbol], fallbackContract: contracts.oracle }))
      );
      const basketSymbolToOracleId = new Map();
      wave3.forEach((r, i) => {
        if (!r.success) return;
        const oracleId = parseInt(r.result.id);
        const decimals = parseInt(r.result.decimals);
        if (oracleId > 0) {
          basketSymbolToOracleId.set(basketItems[i].symbol, {
            oracleId, decimals,
            share: basketItems[i].share,
            initialPrice: basketItems[i].initialPrice,
          });
        }
      });

      // Wave 4: instruments
      const symbolEntries = Array.from(basketSymbolToOracleId.entries());
      const wave4 = await batchCachedContractCalls(
        symbolEntries.map(([, info]) => ({ contractKey: 'oracle', methodName: 'instruments', args: [info.oracleId], fallbackContract: contracts.oracle }))
      );
      const instrumentsMap = new Map();
      wave4.forEach((r, i) => {
        const [symbol, info] = symbolEntries[i];
        if (!r.success) return;
        instrumentsMap.set(info.oracleId, {
          id: info.oracleId, symbol, decimals: info.decimals,
          currentPrice: parseFloat(r.result.price) / 10 ** info.decimals,
          timestamp: parseInt(r.result.timeStamp),
          initialPrice: info.initialPrice,
        });
      });

      // ETH (not basket)
      let ethOracleId = null;
      try {
        const ethDict = await contracts.oracle.methods.dictionary('eth').call();
        const parsedEthId = parseInt(ethDict.id);
        if (parsedEthId > 0) {
          const ethInstrument = await contracts.oracle.methods.instruments(parsedEthId).call();
          const ethDecimals = parseInt(ethDict.decimals);
          instrumentsMap.set(parsedEthId, {
            id: parsedEthId,
            symbol: 'ETH',
            decimals: ethDecimals,
            currentPrice: parseFloat(ethInstrument.price) / 10 ** ethDecimals,
            timestamp: parseInt(ethInstrument.timeStamp),
            initialPrice: null,
          });
          ethOracleId = parsedEthId;
        }
      } catch (err) {
        console.warn('ETH not in oracle:', err);
      }

      // History via worker only
      const txs = await getContractTransactions(oracleAddress, 100);
      const transactions = txs.filter((tx) => tx.method === 'updateSeveralPrices');

      const priceMap = new Map();
      const updateSeveralPricesABI = contracts.oracle._jsonInterface.find(
        (x) => x.name === 'updateSeveralPrices' && x.type === 'function'
      );

      for (const tx of transactions) {
        try {
          const decoded = web3.eth.abi.decodeParameters(updateSeveralPricesABI.inputs, tx.input.slice(10));
          const ids = decoded.ids || decoded[0];
          const prices = decoded.prices || decoded[1];
          const timestamp = parseInt(tx.blockTimestamp);
          const blockNumber = parseInt(tx.blockNumber);
          const key = `${timestamp}-${blockNumber}`;
          if (!priceMap.has(key)) {
            priceMap.set(key, {
              timestamp, blockNumber,
              date: new Date(timestamp * 1000).toLocaleDateString('ru-RU'),
              time: new Date(timestamp * 1000).toLocaleTimeString('ru-RU'),
            });
          }
          const entry = priceMap.get(key);

          for (let i = 0; i < ids.length; i++) {
            const id = parseInt(ids[i]);
            const info = instrumentsMap.get(id);
            if (info) {
              const price = parseFloat(prices[i]) / 10 ** info.decimals;
              entry[info.symbol] = price;
              entry[`${info.symbol}_original`] = price;
            }
          }

          let weightedRatioSum = 0;
          for (const [symbol, info] of basketSymbolToOracleId) {
            const cur = entry[symbol];
            if (cur && info.initialPrice > 0) {
              weightedRatioSum += (cur / info.initialPrice) * info.share;
            }
          }
          if (totalShares > 0) entry.DFC = weightedRatioSum / totalShares;
        } catch (e) { console.error('decode fail', tx.hash, e); }
      }

      // current DFC
      let currentSum = 0; let latestTs = 0;
      for (const [, info] of basketSymbolToOracleId) {
        const inst = instrumentsMap.get(info.oracleId);
        if (inst && info.initialPrice > 0) {
          currentSum += (inst.currentPrice / info.initialPrice) * info.share;
          latestTs = Math.max(latestTs, inst.timestamp);
        }
      }
      const currentDfc = totalShares > 0 ? currentSum / totalShares : 0;

      // sort + normalize
      const priceHistory = Array.from(priceMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      const firstDFC = priceHistory.length > 0 ? priceHistory[0].DFC : null;
      if (firstDFC && firstDFC > 0) priceHistory.forEach((e) => { if (e.DFC) e.DFC /= firstDFC; });

      for (const [symbol, info] of basketSymbolToOracleId) {
        if (info.initialPrice && info.initialPrice > 0) {
          priceHistory.forEach((e) => { if (e[symbol]) e[symbol] /= info.initialPrice; });
        }
      }
      const firstEthEntry = priceHistory.find((e) => e.ETH !== undefined);
      const firstETHRaw = firstEthEntry ? firstEthEntry.ETH : null;
      if (firstETHRaw && firstETHRaw > 0) {
        priceHistory.forEach((e) => { if (e.ETH !== undefined) e.ETH /= firstETHRaw; });
      }

      const normalizedCurrentDFC = firstDFC && firstDFC > 0 ? currentDfc / firstDFC : currentDfc;
      const ethInst = ethOracleId !== null ? instrumentsMap.get(ethOracleId) : null;

      const instruments = [
        { id: 0, symbol: 'DFC', currentPrice: normalizedCurrentDFC, timestamp: latestTs },
        ...(ethInst ? [{
          id: ethInst.id, symbol: 'ETH',
          originalPrice: ethInst.currentPrice,
          currentPrice: firstETHRaw && firstETHRaw > 0 ? ethInst.currentPrice / firstETHRaw : ethInst.currentPrice,
          timestamp: ethInst.timestamp,
          initialPrice: firstETHRaw || undefined,
        }] : []),
        ...Array.from(instrumentsMap.values())
          .filter((i) => i.symbol !== 'ETH')
          .map((i) => ({
            ...i,
            originalPrice: i.currentPrice,
            currentPrice: i.initialPrice && i.initialPrice > 0 ? i.currentPrice / i.initialPrice : i.currentPrice,
          })),
      ];

      setState({ loading: false, error: null, oracleAddress, instrumentsCount, instruments, priceHistory });
    } catch (e) {
      console.error('useExchangeRate failed:', e);
      setState((s) => ({ ...s, loading: false, error: e.message || String(e) }));
    }
  }, [contracts, web3]);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}
