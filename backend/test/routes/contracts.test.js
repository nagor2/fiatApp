const request = require('supertest');

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockCdpState = {
  stubFund: '1000.00000000',
  totalSupply: '950.0000',
  ruleBalance: '5.00',
  allowanceToAuction: '0.00',
  ethBalance: '1.50',
  numPositions: 3,
  collateralDiscount: '5%',
  interestRate: '2%',
  address: '0xCDP',
};

const mockDaoState = {
  activeVoting: '0',
  totalPooled: '100.00',
  address: '0xDAO',
};

const mockBasketState = {
  itemsCount: 2,
  items: [
    { symbol: 'XAU', initialPrice: '1800.00000', currentPrice: '1950.00000' },
    { symbol: 'XAG', initialPrice: '25.00000',   currentPrice: '28.00000'   },
  ],
};

jest.mock('../../src/services/cacheService', () => ({
  enabled: true,
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  generateKey: jest.fn((...args) => args.join(':')),
  invalidatePattern: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/contractService', () => ({
  contracts: {
    dao:      { _address: '0xDAO' },
    cdp:      { _address: '0xCDP' },
    auction:  { _address: '0xAUCTION' },
    flatCoin: { _address: '0xFLATCOIN' },
    rule:     { _address: '0xRULE' },
    basket:   { _address: '0xBASKET' },
  },
  getCDPState:    jest.fn().mockResolvedValue(mockCdpState),
  getDAOState:    jest.fn().mockResolvedValue(mockDaoState),
  getBasketState: jest.fn().mockResolvedValue(mockBasketState),
  callMethod:     jest.fn().mockResolvedValue('42'),
  invalidateContract: jest.fn().mockResolvedValue(undefined),
}));

const { buildApp } = require('../helpers/app');
const contractService = require('../../src/services/contractService');

describe('GET /api/contracts/cdp/state', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with CDP state shape', async () => {
    const res = await request(app).get('/api/contracts/cdp/state');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ numPositions: 3, address: '0xCDP' });
  });

  it('returns 500 when service throws', async () => {
    contractService.getCDPState.mockRejectedValueOnce(new Error('RPC error'));
    const res = await request(app).get('/api/contracts/cdp/state');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('RPC error');
  });
});

describe('GET /api/contracts/dao/state', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with DAO state shape', async () => {
    const res = await request(app).get('/api/contracts/dao/state');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ address: '0xDAO', totalPooled: '100.00' });
  });

  it('returns 500 when service throws', async () => {
    contractService.getDAOState.mockRejectedValueOnce(new Error('timeout'));
    const res = await request(app).get('/api/contracts/dao/state');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/contracts/basket/state', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  it('returns 200 with basket items', async () => {
    const res = await request(app).get('/api/contracts/basket/state');
    expect(res.status).toBe(200);
    expect(res.body.data.itemsCount).toBe(2);
    expect(res.body.data.items).toHaveLength(2);
  });
});

describe('GET /api/contracts/:contract/:method', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => jest.clearAllMocks());

  it('calls callMethod and returns result', async () => {
    contractService.callMethod.mockResolvedValueOnce('100');
    const res = await request(app).get('/api/contracts/dao/activeVoting');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBe('100');
  });

  it('passes query args as array', async () => {
    contractService.callMethod.mockResolvedValueOnce('50');
    await request(app).get('/api/contracts/dao/params?args=interestRate');
    expect(contractService.callMethod).toHaveBeenCalledWith(
      'dao', 'params', ['interestRate'], expect.any(Object)
    );
  });

  it('returns 500 on contract error', async () => {
    contractService.callMethod.mockRejectedValueOnce(new Error('not found'));
    const res = await request(app).get('/api/contracts/dao/unknownMethod');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/contracts/:contract/invalidate', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  it('calls invalidateContract and returns success', async () => {
    const res = await request(app).post('/api/contracts/dao/invalidate');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(contractService.invalidateContract).toHaveBeenCalledWith('dao');
  });
});
