const request = require('supertest');

jest.mock('../../src/services/cacheService', () => ({
  enabled: true,
  connect: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/services/contractService', () => ({
  contracts: {},
  init: jest.fn(),
}));

const { buildApp } = require('../helpers/app');

describe('GET /health', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  it('returns 200 with status=healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('includes uptime as a number', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('includes ISO timestamp', async () => {
    const res = await request(app).get('/health');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('reports cache enabled when cacheService.enabled is true', async () => {
    const res = await request(app).get('/health');
    expect(res.body.cache).toBe('enabled');
  });
});
