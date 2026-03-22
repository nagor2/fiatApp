/**
 * Кэшированный вызов метода контракта через Block Watcher API
 * 
 * @param {string} contractKey - Ключ контракта (cdp, oracle, basket, etc)
 * @param {string} methodName - Имя метода контракта
 * @param {Array} args - Аргументы метода (опционально)
 * @param {Object} fallbackContract - Web3 contract instance для fallback если API недоступен
 * @returns {Promise} - Результат вызова метода
 */
export async function cachedContractCall(contractKey, methodName, args = [], fallbackContract = null) {
  try {
    // В dev режиме обращаемся напрямую к Block Watcher (порт 3002)
    // В production это будет проксироваться через nginx
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3002' 
      : '';
    
    const apiUrl = `${baseUrl}/api/call/${contractKey}/${methodName}`;
    const params = args.length > 0 ? `?args=${encodeURIComponent(JSON.stringify(args))}` : '';
    
    const response = await fetch(apiUrl + params);
    const data = await response.json();
    
    if (data.success) {
      // API вернул успешный результат (из кэша или RPC)
      if (data.cached) {
        console.log(`[Cache HIT] ${contractKey}.${methodName}(${args.join(', ')})`);
      } else {
        console.log(`[Cache MISS] ${contractKey}.${methodName}(${args.join(', ')})`);
      }
      return data.result;
    } else {
      throw new Error(data.error || 'API call failed');
    }
  } catch (error) {
    console.warn(`Cached API failed for ${contractKey}.${methodName}, falling back to direct RPC:`, error.message);
    
    // Fallback: прямой вызов через Web3 если API недоступен
    if (fallbackContract && fallbackContract.methods[methodName]) {
      return await fallbackContract.methods[methodName](...args).call();
    }
    
    throw error;
  }
}

/**
 * Batch вызов нескольких методов контракта
 * Оптимизация: все вызовы идут параллельно
 */
export async function batchCachedContractCalls(calls) {
  const promises = calls.map(({ contractKey, methodName, args, fallbackContract }) =>
    cachedContractCall(contractKey, methodName, args, fallbackContract)
  );
  
  return await Promise.all(promises);
}
