import { Types } from 'mongoose';
import request from 'supertest';
import { createTestApp, TestApp } from './test-app';

describe('Brands API', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.clear());
  afterAll(() => t.close());

  const http = () => request(t.app.getHttpServer());
  const createBrand = (name: unknown) => http().post('/api/brands').send({ name });
  const brandNames = async () => (await http().get('/api/brands').expect(200)).body.map((b: { name: string }) => b.name);

  it('has a unique index on normalizedName', async () => {
    const indexes = await t.connection.collection('brands').indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: { normalizedName: 1 }, unique: true })]),
    );
  });

  describe('Requirement: Create a brand', () => {
    it('Scenario: Creating a brand', async () => {
      const res = await createBrand('Uniqlo').expect(201);
      expect(res.headers['location']).toBe(`/api/brands/${res.body.id}`);
      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'Uniqlo',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(await brandNames()).toEqual(['Uniqlo']);
    });

    it.each([
      ['empty', ''],
      ['only whitespace', '   '],
      ['missing', undefined],
    ])('Scenario: Empty name (%s)', async (_label, name) => {
      const res = await createBrand(name).expect(422);
      expect(res.body.errors).toEqual([{ field: 'name', message: 'name is required' }]);
      expect(await brandNames()).toEqual([]);
    });
  });

  describe('Requirement: Brand names are unique ignoring case and whitespace', () => {
    it('Scenario: Duplicate name with different case and spacing', async () => {
      await createBrand('Nike').expect(201);
      const res = await createBrand('nike ').expect(409).expect('Content-Type', /application\/problem\+json/);
      expect(res.body.detail).toMatch(/already exists/);
      expect(await brandNames()).toEqual(['Nike']);
    });

    it('Scenario: Name is trimmed on save', async () => {
      const res = await createBrand("  Levi's  ").expect(201);
      expect(res.body.name).toBe("Levi's");
    });
  });

  describe('Requirement: List brands', () => {
    it('Scenario: Listing brands', async () => {
      await createBrand('uniqlo').expect(201);
      await createBrand('Nike').expect(201);
      await createBrand("Arc'teryx").expect(201);
      expect(await brandNames()).toEqual(["Arc'teryx", 'Nike', 'uniqlo']);
    });
  });

  describe('Requirement: Rename a brand', () => {
    it('Scenario: Renaming a brand', async () => {
      const { body } = await createBrand('Levis').expect(201);
      const res = await http().patch(`/api/brands/${body.id}`).send({ name: "Levi's" }).expect(200);
      expect(res.body).toMatchObject({ id: body.id, name: "Levi's" });
      // Items showing the new name are covered in items.spec.ts.
    });

    it('Scenario: Renaming to an existing name', async () => {
      await createBrand('Nike').expect(201);
      const { body: nikey } = await createBrand('Nikey').expect(201);
      await http().patch(`/api/brands/${nikey.id}`).send({ name: 'NIKE' }).expect(409);
      expect(await brandNames()).toEqual(['Nike', 'Nikey']);
    });

    it.each([
      ['an unknown id', new Types.ObjectId().toString()],
      ['a malformed id', 'not-an-id'],
    ])('returns 404 for %s', async (_label, id) => {
      const res = await http().patch(`/api/brands/${id}`).send({ name: 'X' }).expect(404);
      expect(res.body).toMatchObject({ status: 404, detail: 'Brand not found.' });
    });
  });

  describe('Requirement: Delete a brand only when unused', () => {
    it('Scenario: Deleting an unused brand', async () => {
      const { body } = await createBrand('Nike').expect(201);
      await http().delete(`/api/brands/${body.id}`).expect(204, '');
      expect((await http().get('/api/brands')).body).toEqual([]);
    });

    it('Scenario: Deleting a brand in use', async () => {
      const { body } = await createBrand('Nike').expect(201);
      const other = (await http().post('/api/categories').send({ name: 'Other', slot: 'top' }).expect(201)).body;
      for (let i = 0; i < 2; i++) {
        await http()
          .post('/api/items')
          .send({ name: `Item ${i}`, primaryColor: '#000', categoryId: other.id, brandId: body.id })
          .expect(201);
      }
      const res = await http()
        .delete(`/api/brands/${body.id}`)
        .expect(409)
        .expect('Content-Type', /application\/problem\+json/);
      expect(res.body).toMatchObject({ status: 409, itemCount: 2 });
      expect(res.body.detail).toMatch(/is used by 2 items/);
      expect((await http().get('/api/brands')).body.map((x: { id: string }) => x.id)).toContain(body.id);
    });

    it('says "1 item" for a single item', async () => {
      const { body } = await createBrand('Nike').expect(201);
      const other = (await http().post('/api/categories').send({ name: 'Other', slot: 'top' }).expect(201)).body;
      await http()
        .post('/api/items')
        .send({ name: 'Only', primaryColor: '#000', categoryId: other.id, brandId: body.id })
        .expect(201);
      const res = await http().delete(`/api/brands/${body.id}`).expect(409);
      expect(res.body).toMatchObject({ itemCount: 1, detail: expect.stringMatching(/is used by 1 item\.$/) });
    });

    it.each([
      ['an unknown id', new Types.ObjectId().toString()],
      ['a malformed id', 'not-an-id'],
    ])('Scenario: Deleting a brand that does not exist (%s)', async (_label, id) => {
      const res = await http().delete(`/api/brands/${id}`).expect(404);
      expect(res.body.detail).toBe('Brand not found.');
    });
  });
});
