import request from 'supertest';
import { createTestApp, TestApp } from './test-app';

describe('API harness', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.clear());
  afterAll(() => t.close());

  it('returns 404 for an unknown route', async () => {
    await request(t.app.getHttpServer()).get('/api/does-not-exist').expect(404);
  });
});
