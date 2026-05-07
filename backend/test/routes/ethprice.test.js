const request = require('supertest');
const https = require('https');
const { EventEmitter } = require('events');

jest.mock('../../src/services/cacheService', () => ({ enabled: false }));
jest.mock('../../src/services/contractService', () => ({ contracts: {} }));

const { buildApp } = require('../helpers/app');

// Helper: mock https.get to emit a fake response
function mockHttpsGet(statusCode, body) {
  jest.spyOn(https, 'get').mockImplementationOnce((url, cb) => {
    const res = new EventEmitter();
    res.statusCode = statusCode;
    process.nextTick(() => {
      cb(res);
      res.emit('data', JSON.stringify(body));
      res.emit('end');
    });
    return { on: jest.fn() };
  });
}

describe('GET /api/ethprice', () => {
  let app;
  const OLD_ENV = process.env;

  beforeAll(() => { app = buildApp(); });
  beforeEach(() => {
    process.env = { ...OLD_ENV, ETHERSCAN_API_KEY: 'TEST_KEY' };
    jest.restoreAllMocks();
  });
  afterAll(() => { process.env = OLD_ENV; });

  it('returns Etherscan data when API key is set', async () => {
    const etherscanBody = { status: '1', result: { ethusd: '2400.00' } };
    mockHttpsGet(200, etherscanBody);

    const res = await request(app).get('/api/ethprice');
    expect(res.status).toBe(200);
    expect(res.body.result.ethusd).toBe('2400.00');
  });

  it('returns 500 when ETHERSCAN_API_KEY is missing', async () => {
    delete process.env.ETHERSCAN_API_KEY;
    const res = await request(app).get('/api/ethprice');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/ETHERSCAN_API_KEY/);
  });

  it('returns 502 when Etherscan returns invalid JSON', async () => {
    jest.spyOn(https, 'get').mockImplementationOnce((url, cb) => {
      const res = new EventEmitter();
      res.statusCode = 200;
      process.nextTick(() => { cb(res); res.emit('data', 'not-json'); res.emit('end'); });
      return { on: jest.fn() };
    });
    const res = await request(app).get('/api/ethprice');
    expect(res.status).toBe(502);
  });

  it('returns 502 when https.get emits error', async () => {
    jest.spyOn(https, 'get').mockImplementationOnce((url, cb) => {
      const req = new EventEmitter();
      process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')));
      return req;
    });
    const res = await request(app).get('/api/ethprice');
    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/ECONNREFUSED/);
  });
});
