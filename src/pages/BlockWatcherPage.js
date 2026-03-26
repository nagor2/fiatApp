import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';

function BlockWatcherPage({ emitter }) {
  const [workerHealth, setWorkerHealth] = useState(null);
  const [selectedContract, setSelectedContract] = useState('');
  const [contractsList, setContractsList] = useState([]);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [methodFilter, setMethodFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  
  // Пагинация
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsLimit, setEventsLimit] = useState(25);
  const [eventsPagination, setEventsPagination] = useState(null);
  const [txsPage, setTxsPage] = useState(1);
  const [txsLimit, setTxsLimit] = useState(25);
  const [txsPagination, setTxsPagination] = useState(null);

  useEffect(() => {
    // Загружаем health status воркера
    const fetchHealth = async () => {
      try {
        const response = await fetch('http://localhost:3002/health');
        const data = await response.json();
        setWorkerHealth(data);
      } catch (error) {
        console.error('Failed to fetch worker health:', error);
        setWorkerHealth({ status: 'error', error: error.message });
      }
    };

    fetchHealth();
    const healthInterval = setInterval(fetchHealth, 5000);

    // Загружаем список контрактов
    const fetchContracts = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/contracts');
        const data = await response.json();
        setContractsList(data.contracts || []);
        if (data.contracts && data.contracts.length > 0) {
          setSelectedContract(data.contracts[0].address);
        }
      } catch (error) {
        console.error('Failed to fetch contracts:', error);
      }
    };

    fetchContracts();

    return () => clearInterval(healthInterval);
  }, []);

  // Сброс пагинации при смене контракта
  useEffect(() => {
    setEventsPage(1);
    setTxsPage(1);
  }, [selectedContract]);
  
  // Сброс пагинации events при смене фильтра
  useEffect(() => {
    setEventsPage(1);
  }, [eventTypeFilter]);
  
  // Сброс пагинации transactions при смене фильтра
  useEffect(() => {
    setTxsPage(1);
  }, [methodFilter]);

  useEffect(() => {
    // Загружаем данные для выбранного контракта
    if (!selectedContract) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const eventFilter = eventTypeFilter !== 'all' ? `&event=${eventTypeFilter}` : '';
        
        const [eventsRes, txsRes] = await Promise.all([
          fetch(`http://localhost:3002/api/events/${selectedContract}?page=${eventsPage}&limit=${eventsLimit}${eventFilter}`),
          fetch(`http://localhost:3002/api/transactions/${selectedContract}?page=${txsPage}&limit=${txsLimit}`)
        ]);
        
        const eventsData = await eventsRes.json();
        const txsData = await txsRes.json();
        
        setEvents(eventsData.events || []);
        setEventsPagination(eventsData.pagination || null);
        setTransactions(txsData.transactions || []);
        setTxsPagination(txsData.pagination || null);
      } catch (error) {
        console.error('Failed to fetch contract data:', error);
        setEvents([]);
        setTransactions([]);
        setEventsPagination(null);
        setTxsPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedContract, eventsPage, eventsLimit, txsPage, txsLimit, eventTypeFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'degraded': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('ru-RU');
  };

  const formatUptime = (ms) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}д ${hours % 24}ч`;
    if (hours > 0) return `${hours}ч ${minutes % 60}м`;
    return `${minutes}м ${seconds % 60}с`;
  };

  const decodeMethodSignature = (input) => {
    if (!input || input === '0x' || input.length < 10) return 'Transfer';
    const methodId = input.slice(0, 10);
    
    const knownMethods = {
      // ERC-20 Standard
      '0xa9059cbb': 'Transfer',
      '0x23b872dd': 'Transfer From',
      '0x095ea7b3': 'Approve',
      '0x40c10f19': 'Mint',
      '0x42966c68': 'Burn',
      '0x70a08231': 'Balance Of',
      '0x18160ddd': 'Total Supply',
      
      // Common DeFi
      '0xd0e30db0': 'Deposit',
      '0x2e1a7d4d': 'Withdraw',
      '0x3ccfd60b': 'Withdraw',
      
      // Oracle Contract (exchangeRateContract)
      '0xad7a9784': 'Update Single Price',
      '0x506e4d9a': 'Update Several Prices',
      '0xbc8a86d5': 'Update Instrument',
      '0x45c9c1d1': 'Add Instrument',
      '0x132308b3': 'Request Multiple Prices Update',
      '0x64eff0d1': 'Request Price Update',
      '0xb3f05b97': 'Finalize',
      '0x12d0e65a': 'Change Beneficiary Address',
      '0x1a83c469': 'Change Updater Address',
      '0x7a7a3206': 'Transfer Profit',
      
      // CDP / Deposit / Auction
      '0x1249c58b': 'Open Position',
      '0xfcfff16f': 'Close Position',
      '0x8a19c8bc': 'Liquidate',
      '0x47e7ef24': 'Deposit',
      '0x454a2ab3': 'Place Bid',
      '0x91f90157': 'Settle Auction'
    };
    
    return knownMethods[methodId] || methodId;
  };

  // Используем tx.method если есть, иначе декодируем на клиенте
  const getMethod = (tx) => tx.method || decodeMethodSignature(tx.input);
  
  const uniqueMethods = [...new Set(transactions.map(tx => getMethod(tx)))];
  const uniqueEventTypes = [...new Set(events.map(e => e.event))];

  const filteredTransactions = methodFilter && methodFilter !== 'all'
    ? transactions.filter(tx => getMethod(tx) === methodFilter)
    : transactions;

  const filteredEvents = eventTypeFilter && eventTypeFilter !== 'all'
    ? events.filter(e => e.event === eventTypeFilter)
    : events;

  return (
    <MainLayout emitter={emitter}>
        <div style={{
          padding: '20px',
          background: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#000' }}>Block Watcher Status</h2>
          {workerHealth ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px',
              color: '#000'
            }}>
              <div>
                <strong>Status:</strong>
                <span style={{ 
                  marginLeft: '10px', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  background: getStatusColor(workerHealth.status),
                  color: 'white',
                  fontSize: '12px'
                }}>
                  {workerHealth.status?.toUpperCase()}
                </span>
              </div>
              <div>
                <strong>Uptime:</strong> {formatUptime(workerHealth.uptime)}
              </div>
              <div>
                <strong>Watched Contracts:</strong> {workerHealth.watchedAddressesCount || 0}
              </div>
              <div>
                <strong>Transactions Indexed:</strong> {workerHealth.transactionsIndexed || 0}
              </div>
              <div>
                <strong>Events Indexed:</strong> {workerHealth.eventsIndexed || 0}
              </div>
              <div>
                <strong>Last Network Block:</strong> {workerHealth.lastNetworkBlock || '-'}
              </div>
              <div>
                <strong>Last Network Block Time:</strong>
                <br />
                <small>{formatTimestamp(workerHealth.lastNetworkBlockTime)}</small>
              </div>
              <div>
                <strong>Last Relevant Block:</strong> {workerHealth.lastRelevantBlock || '-'}
              </div>
              <div>
                <strong>Last Relevant Block Time:</strong>
                <br />
                <small>{formatTimestamp(workerHealth.lastRelevantBlockTime)}</small>
              </div>
              <div>
                <strong>Last Processed Block:</strong> {workerHealth.lastProcessedBlock || '-'}
              </div>
              {workerHealth.historicalSyncProgress && (
                <div style={{ gridColumn: '1 / -1', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <strong>Historical Sync Progress:</strong>
                  <div style={{ marginTop: '5px', color: '#666' }}>
                    {workerHealth.historicalSyncProgress.phase === 'transactions' && (
                      <div>Loading transactions: {workerHealth.historicalSyncProgress.currentBlock} / {workerHealth.historicalSyncProgress.endBlock}</div>
                    )}
                    {workerHealth.historicalSyncProgress.phase === 'events' && (
                      <div>Loading events: {workerHealth.historicalSyncProgress.currentBlock} / {workerHealth.historicalSyncProgress.endBlock}</div>
                    )}
                  </div>
                </div>
              )}
              
              {workerHealth.cache && (
                <>
                  <div style={{ gridColumn: '1 / -1', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #eee' }}>
                    <strong style={{ fontSize: '16px', color: '#333' }}>Redis Cache Statistics</strong>
                  </div>
                  <div>
                    <strong>Cache Hit Rate:</strong>
                    <span style={{ 
                      marginLeft: '10px', 
                      padding: '5px 12px', 
                      borderRadius: '4px',
                      background: parseFloat(workerHealth.cache.hitRate) > 90 ? '#4caf50' : parseFloat(workerHealth.cache.hitRate) > 70 ? '#ff9800' : '#f44336',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {workerHealth.cache.hitRate}
                    </span>
                  </div>
                  <div>
                    <strong>Cache Hits:</strong> {workerHealth.cache.hits?.toLocaleString('ru-RU')}
                  </div>
                  <div>
                    <strong>Cache Misses:</strong> {workerHealth.cache.misses?.toLocaleString('ru-RU')}
                  </div>
                  <div>
                    <strong>Total Requests:</strong> {workerHealth.cache.total?.toLocaleString('ru-RU')}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>Loading worker status...</div>
          )}

          {/* Contract Selector */}
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
            <label htmlFor="contract-select" style={{ marginRight: '10px', fontWeight: 'bold', color: '#000' }}>
              Select Contract:
            </label>
            <select 
              id="contract-select"
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              style={{
                padding: '8px 12px',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#000',
                fontSize: '14px',
                minWidth: '300px'
              }}
            >
              {contractsList.map(contract => (
                <option key={contract.address} value={contract.address}>
                  {contract.name} ({contract.address.slice(0, 10)}...{contract.address.slice(-8)})
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', borderBottom: '2px solid #ddd' }}>
            <button
              onClick={() => setActiveTab('events')}
              style={{
                padding: '10px 20px',
                background: activeTab === 'events' ? '#4caf50' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'events' ? '3px solid #4caf50' : 'none',
                color: activeTab === 'events' ? '#fff' : '#000',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'events' ? 'bold' : 'normal'
              }}
            >
              Events ({filteredEvents.length}/{eventsPagination?.total || events.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              style={{
                padding: '10px 20px',
                background: activeTab === 'transactions' ? '#2196f3' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'transactions' ? '3px solid #2196f3' : 'none',
                color: activeTab === 'transactions' ? '#fff' : '#000',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'transactions' ? 'bold' : 'normal'
              }}
            >
              Transactions ({filteredTransactions.length}/{txsPagination?.total || transactions.length})
            </button>
          </div>

          {/* Events Table */}
          {activeTab === 'events' && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#000' }}>Indexed Events {loading && '(Loading...)'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: '#000', fontSize: '14px' }}>Filter by Event Type:</label>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      color: '#000',
                      fontSize: '13px'
                    }}
                  >
                    <option value="all">All ({events.length})</option>
                    {uniqueEventTypes.map(type => (
                      <option key={type} value={type}>
                        {type} ({events.filter(e => e.event === type).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {events.length > 0 ? (
                <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Event</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Block</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Timestamp</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Transaction</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Return Values</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event, idx) => (
                        <tr key={`${event.transactionHash}-${event.logIndex}`} style={{
                          borderBottom: '1px solid #eee',
                          background: idx % 2 === 0 ? '#fff' : '#f9f9f9'
                        }}>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#4caf50' }}>
                            {event.event}
                          </td>
                          <td style={{ padding: '10px', color: '#000' }}>
                            {event.blockNumber}
                          </td>
                          <td style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
                            {formatTimestamp(event.blockTimestamp * 1000)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
                            <a 
                              href={`https://etherscan.io/tx/${event.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2196f3' }}
                            >
                              {event.transactionHash.slice(0, 10)}...{event.transactionHash.slice(-8)}
                            </a>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <details>
                              <summary style={{ cursor: 'pointer', color: '#2196f3' }}>
                                Show values
                              </summary>
                              <pre style={{
                                marginTop: '10px',
                                padding: '10px',
                                background: '#f5f5f5',
                                borderRadius: '4px',
                                fontSize: '11px',
                                overflow: 'auto',
                                maxHeight: '300px',
                                color: '#000',
                                border: '1px solid #ddd'
                              }}>
                                {JSON.stringify(event.returnValues, null, 2)}
                              </pre>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  {loading ? 'Loading events...' : 'No events indexed yet.'}
                </div>
              )}
              
              {/* Events Pagination */}
              {eventsPagination && eventsPagination.total > 0 && (
                <div style={{ 
                  marginTop: '20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: '#000', fontSize: '14px' }}>Items per page:</label>
                    <select
                      value={eventsLimit}
                      onChange={(e) => {
                        setEventsLimit(parseInt(e.target.value));
                        setEventsPage(1);
                      }}
                      style={{
                        padding: '6px 10px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        color: '#000',
                        fontSize: '13px'
                      }}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span style={{ color: '#666', fontSize: '13px' }}>
                      Showing {((eventsPage - 1) * eventsLimit) + 1}-{Math.min(eventsPage * eventsLimit, eventsPagination.total)} of {eventsPagination.total}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                      onClick={() => setEventsPage(1)}
                      disabled={eventsPage === 1}
                      style={{
                        padding: '6px 12px',
                        background: eventsPage === 1 ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: eventsPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      First
                    </button>
                    <button
                      onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                      disabled={eventsPage === 1}
                      style={{
                        padding: '6px 12px',
                        background: eventsPage === 1 ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: eventsPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '6px 12px', color: '#000', fontSize: '13px', fontWeight: 'bold' }}>
                      Page {eventsPage} of {eventsPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setEventsPage(p => Math.min(eventsPagination.totalPages, p + 1))}
                      disabled={eventsPage === eventsPagination.totalPages}
                      style={{
                        padding: '6px 12px',
                        background: eventsPage === eventsPagination.totalPages ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: eventsPage === eventsPagination.totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setEventsPage(eventsPagination.totalPages)}
                      disabled={eventsPage === eventsPagination.totalPages}
                      style={{
                        padding: '6px 12px',
                        background: eventsPage === eventsPagination.totalPages ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: eventsPage === eventsPagination.totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transactions Table */}
          {activeTab === 'transactions' && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#000' }}>Indexed Transactions {loading && '(Loading...)'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: '#000', fontSize: '14px' }}>Filter by Method:</label>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      color: '#000',
                      fontSize: '13px'
                    }}
                  >
                    <option value="all">All ({transactions.length})</option>
                    {uniqueMethods.map(method => (
                      <option key={method} value={method}>
                        {method} ({transactions.filter(tx => getMethod(tx) === method).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {transactions.length > 0 ? (
                <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Hash</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Method</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Block</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Timestamp</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>From</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>To</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Value</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Gas Used</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx, idx) => (
                        <tr key={tx.hash} style={{
                          borderBottom: '1px solid #eee',
                          background: idx % 2 === 0 ? '#fff' : '#f9f9f9'
                        }}>
                          <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
                            <a 
                              href={`https://etherscan.io/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2196f3' }}
                            >
                              {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                            </a>
                          </td>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#2196f3' }}>
                            {getMethod(tx)}
                          </td>
                          <td style={{ padding: '10px', color: '#000' }}>
                            {tx.blockNumber}
                          </td>
                          <td style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
                            {formatTimestamp(tx.blockTimestamp * 1000)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
                            {tx.from ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}` : '-'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
                            {tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : 'Contract Creation'}
                          </td>
                          <td style={{ padding: '10px', color: '#000' }}>
                            {tx.value ? (parseInt(tx.value) / 1e18).toFixed(4) : '0'} ETH
                          </td>
                          <td style={{ padding: '10px', color: '#000' }}>
                            {tx.gasUsed || '-'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              background: tx.isError === '0' ? '#4caf50' : '#f44336',
                              color: 'white'
                            }}>
                              {tx.isError === '0' ? 'Success' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  {loading ? 'Loading transactions...' : 'No transactions indexed yet.'}
                </div>
              )}
              
              {/* Transactions Pagination */}
              {txsPagination && txsPagination.total > 0 && (
                <div style={{ 
                  marginTop: '20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: '#000', fontSize: '14px' }}>Items per page:</label>
                    <select
                      value={txsLimit}
                      onChange={(e) => {
                        setTxsLimit(parseInt(e.target.value));
                        setTxsPage(1);
                      }}
                      style={{
                        padding: '6px 10px',
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        color: '#000',
                        fontSize: '13px'
                      }}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span style={{ color: '#666', fontSize: '13px' }}>
                      Showing {((txsPage - 1) * txsLimit) + 1}-{Math.min(txsPage * txsLimit, txsPagination.total)} of {txsPagination.total}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                      onClick={() => setTxsPage(1)}
                      disabled={txsPage === 1}
                      style={{
                        padding: '6px 12px',
                        background: txsPage === 1 ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: txsPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      First
                    </button>
                    <button
                      onClick={() => setTxsPage(p => Math.max(1, p - 1))}
                      disabled={txsPage === 1}
                      style={{
                        padding: '6px 12px',
                        background: txsPage === 1 ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: txsPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '6px 12px', color: '#000', fontSize: '13px', fontWeight: 'bold' }}>
                      Page {txsPage} of {txsPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setTxsPage(p => Math.min(txsPagination.totalPages, p + 1))}
                      disabled={txsPage === txsPagination.totalPages}
                      style={{
                        padding: '6px 12px',
                        background: txsPage === txsPagination.totalPages ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: txsPage === txsPagination.totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setTxsPage(txsPagination.totalPages)}
                      disabled={txsPage === txsPagination.totalPages}
                      style={{
                        padding: '6px 12px',
                        background: txsPage === txsPagination.totalPages ? '#ddd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: txsPage === txsPagination.totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </MainLayout>
  );
}

export default BlockWatcherPage;
