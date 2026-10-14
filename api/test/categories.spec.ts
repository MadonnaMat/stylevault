import { Types } from 'mongoose';
import request from 'supertest';
import { createTestApp, TestApp } from './test-app';

describe('Categories API', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.clear());
  afterAll(() => t.close());

  const http = () => request(t.app.getHttpServer());
  const createCategory = (body: object) => http().post('/api/categories').send(body);
  const fieldMessages = (body: { errors?: { field: string; message: string }[] }, field: string) =>
    (body.errors ?? []).filter((e) => e.field === field).map((e) => e.message);

  it('has a unique index on normalizedName', async () => {
    const indexes = await t.connection.collection('categories').indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: { normalizedName: 1 }, unique: true })]),
    );
  });

  describe('POST /api/categories', () => {
    it('returns 201 with a Location header and the new category', async () => {
      const res = await createCategory({ name: 'Blazers', slot: 'outerwear' }).expect(201);
      expect(res.headers['location']).toBe(`/api/categories/${res.body.id}`);
      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'Blazers',
        slot: 'outerwear',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });

  describe('Requirement: Create a category with a slot', () => {
    it('Scenario: Creating a category', async () => {
      const { body } = await createCategory({ name: 'Blazers', slot: 'outerwear' }).expect(201);
      const list = await http().get('/api/categories').expect(200);
      expect(list.body).toEqual([expect.objectContaining({ id: body.id, name: 'Blazers', slot: 'outerwear' })]);
    });

    it('Scenario: Missing slot', async () => {
      const res = await createCategory({ name: 'Blazers' }).expect(422);
      expect(fieldMessages(res.body, 'slot')).toEqual(['slot is required']);
      expect((await http().get('/api/categories')).body).toEqual([]);
    });

    it('Scenario: Unknown slot', async () => {
      const res = await createCategory({ name: 'Hats', slot: 'headwear' }).expect(422);
      expect(fieldMessages(res.body, 'slot')).toEqual([expect.stringContaining('"headwear" is not allowed')]);
      expect((await http().get('/api/categories')).body).toEqual([]);
    });

    it.each([
      ['empty', ''],
      ['only whitespace', '   '],
      ['missing', undefined],
    ])('Scenario: Empty name (%s)', async (_label, name) => {
      const res = await createCategory({ name, slot: 'top' }).expect(422);
      expect(fieldMessages(res.body, 'name')).toEqual(['name is required']);
      expect((await http().get('/api/categories')).body).toEqual([]);
    });
  });

  describe('Requirement: Category names are unique ignoring case and whitespace', () => {
    it('Scenario: Duplicate name with different case and spacing', async () => {
      await createCategory({ name: 'Shirts', slot: 'top' }).expect(201);
      const res = await createCategory({ name: ' shirts ', slot: 'top' })
        .expect(409)
        .expect('Content-Type', /application\/problem\+json/);
      expect(res.body).toMatchObject({ status: 409, title: 'Conflict' });
      expect(res.body.detail).toMatch(/already exists/);
      const list = await http().get('/api/categories');
      expect(list.body.map((c: { name: string }) => c.name)).toEqual(['Shirts']);
    });

    it('Scenario: Name is trimmed on save', async () => {
      const res = await createCategory({ name: '  Sneakers  ', slot: 'shoes' }).expect(201);
      expect(res.body.name).toBe('Sneakers');
    });
  });

  describe('Requirement: List categories', () => {
    it('Scenario: Listing categories', async () => {
      await createCategory({ name: 'shoes-casual', slot: 'shoes' }).expect(201);
      await createCategory({ name: 'Blazers', slot: 'outerwear' }).expect(201);
      await createCategory({ name: 'Cardigans', slot: 'top' }).expect(201);
      const res = await http().get('/api/categories').expect(200);
      expect(res.body.map((c: { name: string; slot: string }) => [c.name, c.slot])).toEqual([
        ['Blazers', 'outerwear'],
        ['Cardigans', 'top'],
        ['shoes-casual', 'shoes'],
      ]);
    });
  });

  describe('Requirement: Rename a category', () => {
    it('Scenario: Renaming a category', async () => {
      const { body } = await createCategory({ name: 'Blazers', slot: 'outerwear' }).expect(201);
      const res = await http()
        .patch(`/api/categories/${body.id}`)
        .send({ name: ' Jackets & Blazers ' })
        .expect(200);
      expect(res.body).toMatchObject({ id: body.id, name: 'Jackets & Blazers', slot: 'outerwear' });
      // Items showing the new name are covered in items.spec.ts.
    });

    it('Scenario: Renaming to an existing name', async () => {
      await createCategory({ name: 'Shirts', slot: 'top' }).expect(201);
      const { body: tees } = await createCategory({ name: 'Tees', slot: 'top' }).expect(201);
      await http().patch(`/api/categories/${tees.id}`).send({ name: 'SHIRTS' }).expect(409);
      const list = await http().get('/api/categories');
      expect(list.body.map((c: { name: string }) => c.name)).toEqual(['Shirts', 'Tees']);
    });

    it('renaming to the same name in a different case is allowed', async () => {
      const { body } = await createCategory({ name: 'tees', slot: 'top' }).expect(201);
      const res = await http().patch(`/api/categories/${body.id}`).send({ name: 'Tees' }).expect(200);
      expect(res.body.name).toBe('Tees');
    });

    it('rejects an empty name', async () => {
      const { body } = await createCategory({ name: 'Tees', slot: 'top' }).expect(201);
      const res = await http().patch(`/api/categories/${body.id}`).send({ name: '  ' }).expect(422);
      expect(fieldMessages(res.body, 'name')).toEqual(['name is required']);
    });
  });

  describe("Requirement: Change a category's slot", () => {
    it('Scenario: Changing the slot', async () => {
      const { body } = await createCategory({ name: 'Cardigans', slot: 'top' }).expect(201);
      const res = await http().patch(`/api/categories/${body.id}`).send({ slot: 'outerwear' }).expect(200);
      expect(res.body).toMatchObject({ name: 'Cardigans', slot: 'outerwear' });
    });

    it('Scenario: Changing to an unknown slot', async () => {
      const { body } = await createCategory({ name: 'Cardigans', slot: 'top' }).expect(201);
      const res = await http().patch(`/api/categories/${body.id}`).send({ slot: 'headwear' }).expect(422);
      expect(fieldMessages(res.body, 'slot')).toEqual([expect.stringContaining('not allowed')]);
      const list = await http().get('/api/categories');
      expect(list.body[0].slot).toBe('top');
    });

    it('rejects a null slot', async () => {
      const { body } = await createCategory({ name: 'Cardigans', slot: 'top' }).expect(201);
      await http().patch(`/api/categories/${body.id}`).send({ slot: null }).expect(422);
    });
  });

  describe('PATCH /api/categories/:id for unknown ids', () => {
    it.each([
      ['an unknown id', new Types.ObjectId().toString()],
      ['a malformed id', 'not-an-id'],
    ])('returns 404 for %s', async (_label, id) => {
      const res = await http().patch(`/api/categories/${id}`).send({ name: 'X' }).expect(404);
      expect(res.body).toMatchObject({ status: 404, detail: 'Category not found.' });
    });
  });

  describe('Requirement: Delete a category only when unused', () => {
    it('Scenario: Deleting an unused category', async () => {
      const { body } = await createCategory({ name: 'Blazers', slot: 'outerwear' }).expect(201);
      await http().delete(`/api/categories/${body.id}`).expect(204, '');
      expect((await http().get('/api/categories')).body).toEqual([]);
    });

    it('Scenario: Deleting a category in use', async () => {
      const { body } = await createCategory({ name: 'Blazers', slot: 'outerwear' }).expect(201);
      const other = (await http().post('/api/categories').send({ name: 'Other', slot: 'top' }).expect(201)).body;
      for (let i = 0; i < 4; i++) {
        await http()
          .post('/api/items')
          .send({ name: `Item ${i}`, primaryColor: '#000', categoryId: body.id })
          .expect(201);
      }
      const res = await http()
        .delete(`/api/categories/${body.id}`)
        .expect(409)
        .expect('Content-Type', /application\/problem\+json/);
      expect(res.body).toMatchObject({ status: 409, itemCount: 4 });
      expect(res.body.detail).toMatch(/is used by 4 items/);
      expect((await http().get('/api/categories')).body.map((x: { id: string }) => x.id)).toContain(body.id);
    });

    it('says "1 item" for a single item', async () => {
      const { body } = await createCategory({ name: 'Blazers', slot: 'outerwear' }).expect(201);
      const other = (await http().post('/api/categories').send({ name: 'Other', slot: 'top' }).expect(201)).body;
      await http()
        .post('/api/items')
        .send({ name: 'Only', primaryColor: '#000', categoryId: body.id })
        .expect(201);
      const res = await http().delete(`/api/categories/${body.id}`).expect(409);
      expect(res.body).toMatchObject({ itemCount: 1, detail: expect.stringMatching(/is used by 1 item\.$/) });
    });

    it.each([
      ['an unknown id', new Types.ObjectId().toString()],
      ['a malformed id', 'not-an-id'],
    ])('Scenario: Deleting a category that does not exist (%s)', async (_label, id) => {
      const res = await http().delete(`/api/categories/${id}`).expect(404);
      expect(res.body.detail).toBe('Category not found.');
    });
  });
});
