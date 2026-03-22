// API для работы с block-watcher cache
// Заменяет прямые RPC вызовы на кэшированные данные

const WORKER_API_URL = process.env.REACT_APP_WORKERS_HEALTH_URL?.replace('/health', '') || 'http://localhost:3002';

/**
 * Пересинхронизировать кэш контракта
 * @param {string} contractNameOrAddress - имя контракта или адрес
 * @returns {Promise<Object>} результат синхронизации
 */
export async function renewContractCache(contractNameOrAddress) {
  try {
    const response = await fetch(`${WORKER_API_URL}/api/renewCache/${contractNameOrAddress}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to renew cache');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to renew contract cache:', error);
    throw error;
  }
}

/**
 * Получить транзакции контракта из cache
 * @param {string} contractAddress - адрес контракта
 * @param {number} limit - количество последних транзакций
 * @returns {Promise<Array>} массив транзакций
 */
export async function getContractTransactions(contractAddress, limit = 100) {
  try {
    const response = await fetch(`${WORKER_API_URL}/api/transactions/${contractAddress}?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.transactions || [];
  } catch (error) {
    console.error('Failed to fetch transactions from cache:', error);
    return [];
  }
}

/**
 * Получить события контракта из cache
 * @param {string} contractAddress - адрес контракта
 * @param {string} eventName - название события (опционально, если null - все события)
 * @param {number} limit - количество последних событий
 * @returns {Promise<Array>} массив событий
 */
export async function getContractEvents(contractAddress, eventName = null, limit = 100) {
  try {
    const url = eventName 
      ? `${WORKER_API_URL}/api/events/${contractAddress}?event=${eventName}&limit=${limit}`
      : `${WORKER_API_URL}/api/events/${contractAddress}?limit=${limit}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Failed to fetch events from cache:', error);
    return [];
  }
}

/**
 * Конвертирует cached event в формат Web3 event
 * Добавляет методы для совместимости со старым кодом
 */
export function normalizeCachedEvent(cachedEvent) {
  return {
    ...cachedEvent,
    // Для совместимости с Web3 getPastEvents
    address: cachedEvent.contractAddress,
    // returnValues уже есть
  };
}

/**
 * Фильтрация событий по параметрам (аналог filter в getPastEvents)
 * @param {Array} events - массив событий
 * @param {Object} filter - объект фильтров {param: value}
 * @returns {Array} отфильтрованные события
 */
export function filterEvents(events, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) {
    return events;
  }
  
  return events.filter(event => {
    for (const [key, value] of Object.entries(filter)) {
      const eventValue = event.returnValues[key];
      
      // Сравнение с учетом регистра для адресов
      if (typeof value === 'string' && value.startsWith('0x')) {
        if (eventValue?.toLowerCase() !== value.toLowerCase()) {
          return false;
        }
      } else if (eventValue !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Заменяет getPastEventsChunked - загружает события из cache
 * @param {Object} contract - Web3 contract instance (используется только для получения адреса)
 * @param {string} eventName - название события
 * @param {Object} options - опции {filter, fromBlock, toBlock}
 * @param {Object} web3 - Web3 instance (не используется, для совместимости)
 * @returns {Promise<Array>} массив событий
 */
export async function getPastEventsCached(contract, eventName, options = {}, web3) {
  const contractAddress = contract.options.address;
  
  // Загружаем события из cache (limit большой, так как фильтрация на клиенте)
  const events = await getContractEvents(contractAddress, eventName, 10000);
  
  // Применяем фильтры
  let filtered = events;
  
  if (options.filter) {
    filtered = filterEvents(filtered, options.filter);
  }
  
  // Фильтрация по блокам
  if (options.fromBlock && options.fromBlock !== 0) {
    filtered = filtered.filter(e => e.blockNumber >= options.fromBlock);
  }
  
  if (options.toBlock && options.toBlock !== 'latest') {
    filtered = filtered.filter(e => e.blockNumber <= options.toBlock);
  }
  
  return filtered.map(normalizeCachedEvent);
}
