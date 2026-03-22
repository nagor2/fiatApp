/**
 * Утилиты для работы с событиями контрактов
 * Решает проблему "exceed maximum block range" при запросах к RPC
 */

const MAX_BLOCK_RANGE = 49999; // Rivet limit: 50000, оставляем запас

/**
 * Получает события контракта с автоматической разбивкой на чанки
 * 
 * @param {Contract} contract - Web3 contract instance
 * @param {string} eventName - Название события
 * @param {object} options - Опции: { filter, fromBlock, toBlock }
 * @param {Web3} web3 - Web3 instance для получения текущего блока
 * @returns {Promise<Array>} Массив событий
 */
export async function getPastEventsChunked(contract, eventName, options = {}, web3) {
  const fromBlock = options.fromBlock || 0;
  let toBlock = options.toBlock || 'latest';
  
  // Получаем текущий номер блока если toBlock = 'latest'
  if (toBlock === 'latest') {
    toBlock = await web3.eth.getBlockNumber();
  }
  
  const totalRange = Number(toBlock) - Number(fromBlock);
  
  // Если диапазон меньше лимита - делаем один запрос
  if (totalRange <= MAX_BLOCK_RANGE) {
    return await contract.getPastEvents(eventName, {
      ...options,
      fromBlock,
      toBlock
    });
  }
  
  // Разбиваем на чанки
  const allEvents = [];
  let currentFrom = Number(fromBlock);
  const finalTo = Number(toBlock);
  
  while (currentFrom <= finalTo) {
    const currentTo = Math.min(currentFrom + MAX_BLOCK_RANGE, finalTo);
    
    console.log(`Fetching ${eventName} events: blocks ${currentFrom} - ${currentTo}`);
    
    const events = await contract.getPastEvents(eventName, {
      ...options,
      fromBlock: currentFrom,
      toBlock: currentTo
    });
    
    allEvents.push(...events);
    currentFrom = currentTo + 1;
  }
  
  return allEvents;
}

/**
 * Получает последние N событий контракта
 * Запрашивает блоки в обратном порядке для быстрого получения свежих событий
 * 
 * @param {Contract} contract - Web3 contract instance
 * @param {string} eventName - Название события
 * @param {number} limit - Максимум событий
 * @param {object} filter - Фильтр событий
 * @param {Web3} web3 - Web3 instance
 * @returns {Promise<Array>} Массив событий (от новых к старым)
 */
export async function getRecentEvents(contract, eventName, limit, filter = {}, web3) {
  const currentBlock = await web3.eth.getBlockNumber();
  const events = [];
  
  let fromBlock = currentBlock - MAX_BLOCK_RANGE;
  let toBlock = currentBlock;
  
  while (events.length < limit && fromBlock >= 0) {
    const chunk = await contract.getPastEvents(eventName, {
      filter,
      fromBlock: Math.max(0, fromBlock),
      toBlock
    });
    
    // Сортируем по убыванию блоков (новые первыми)
    chunk.sort((a, b) => b.blockNumber - a.blockNumber);
    events.push(...chunk);
    
    if (events.length >= limit) {
      break;
    }
    
    // Следующий чанк
    toBlock = fromBlock - 1;
    fromBlock = toBlock - MAX_BLOCK_RANGE;
  }
  
  return events.slice(0, limit);
}

/**
 * Получает события с постраничной загрузкой
 * Полезно для больших списков с infinite scroll
 * 
 * @param {Contract} contract - Web3 contract instance
 * @param {string} eventName - Название события
 * @param {number} page - Номер страницы (0-based)
 * @param {number} pageSize - Размер страницы
 * @param {object} options - Опции: { filter, fromBlock, toBlock }
 * @param {Web3} web3 - Web3 instance
 * @returns {Promise<{events: Array, hasMore: boolean}>}
 */
export async function getPastEventsPaginated(contract, eventName, page, pageSize, options = {}, web3) {
  const allEvents = await getPastEventsChunked(contract, eventName, options, web3);
  
  // Сортируем по убыванию (новые первыми)
  allEvents.sort((a, b) => b.blockNumber - a.blockNumber);
  
  const start = page * pageSize;
  const end = start + pageSize;
  const events = allEvents.slice(start, end);
  const hasMore = end < allEvents.length;
  
  return { events, hasMore, total: allEvents.length };
}

/**
 * Оценивает диапазон блоков для запроса событий за период времени
 * Ethereum block time ~12 секунд
 * 
 * @param {Web3} web3 - Web3 instance
 * @param {number} daysAgo - Сколько дней назад
 * @returns {Promise<number>} Номер блока
 */
export async function getBlockNumberDaysAgo(web3, daysAgo) {
  const currentBlock = await web3.eth.getBlockNumber();
  const blockTime = 12; // секунд на блок в Ethereum
  const blocksPerDay = (24 * 60 * 60) / blockTime; // ~7200 блоков в день
  const blocksAgo = Math.floor(blocksPerDay * daysAgo);
  
  return Math.max(0, currentBlock - blocksAgo);
}

/**
 * Проверяет не превышает ли диапазон лимит провайдера
 * 
 * @param {number} fromBlock 
 * @param {number|string} toBlock 
 * @param {Web3} web3 
 * @returns {Promise<boolean>}
 */
export async function isBlockRangeSafe(fromBlock, toBlock, web3) {
  if (toBlock === 'latest') {
    toBlock = await web3.eth.getBlockNumber();
  }
  
  const range = Number(toBlock) - Number(fromBlock);
  return range <= MAX_BLOCK_RANGE;
}
