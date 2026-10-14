import { Types } from 'mongoose';
import request from 'supertest';
import { createTestApp, TestApp } from './test-app';

describe('Items API', () => {
  let t: TestApp;
  let blazers: { id: string; name: string; slot: string };
  let uniqlo: { id: string; name: string };

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    blazers = (await http().post('/api/categories').send({ name: 'Blazers', slot: 'outerwear' }).expect(201)).body;
    uniqlo = (await http().post('/api/brands').send({ name: 'Uniqlo' }).expect(201)).body;
  });
  afterEach(() => t.clear());
  afterAll(() => t.close());

  const http = () => request(t.app.getHttpServer());
  const minimal = () => ({ name: 'Navy wool blazer', categoryId: blazers.id, primaryColor: '#1f2a44' });
  const createItem = (body: object) => http().post('/api/items').send(body);
  const listItems = async () => (await http().get('/api/items').expect(200)).body;
  const errorsFor = (body: { errors?: { field: string; message: string }[] }, field: string) =>
    (body.errors ?? []).filter((e) => e.field === field).map((e) => e.message);

  describe('Requirement: Add an item to the closet', () => {
    it('returns 201 with a Location header and the populated item', async () => {
      const res = await createItem(minimal()).expect(201);
      expect(res.headers['location']).toBe(`/api/items/${res.body.id}`);
      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'Navy wool blazer',
        category: { id: blazers.id, name: 'Blazers', slot: 'outerwear' },
        brand: null,
        primaryColor: '#1f2a44',
        secondaryColor: null,
        seasons: [],
        occasions: [],
        notes: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('stores category and brand references as ObjectIds', async () => {
      await createItem({ ...minimal(), brandId: uniqlo.id }).expect(201);
      const [doc] = await t.connection.collection('items').find().toArray();
      expect(doc.categoryId).toBeInstanceOf(Types.ObjectId);
      expect(doc.brandId).toBeInstanceOf(Types.ObjectId);
    });

    it('Scenario: Adding an item with all required fields', async () => {
      const { body } = await createItem(minimal()).expect(201);
      const list = await listItems();
      expect(list).toEqual([expect.objectContaining({ id: body.id, name: 'Navy wool blazer' })]);
    });

    it('Scenario: Adding an item with every optional field', async () => {
      const { body } = await createItem({
        ...minimal(),
        name: '  Navy wool blazer  ',
        brandId: uniqlo.id,
        secondaryColor: '#c0a060',
        seasons: ['fall', 'winter'],
        occasions: ['work', 'formal'],
        notes: '  Dry clean only  ',
      }).expect(201);
      const saved = (await http().get(`/api/items/${body.id}`).expect(200)).body;
      expect(saved).toMatchObject({
        name: 'Navy wool blazer',
        brand: { id: uniqlo.id, name: 'Uniqlo' },
        secondaryColor: '#c0a060',
        seasons: ['fall', 'winter'],
        occasions: ['work', 'formal'],
        notes: 'Dry clean only',
      });
    });

    it.each([
      ['empty', ''],
      ['only whitespace', '  '],
    ])('Scenario: Missing name (%s)', async (_label, name) => {
      const res = await createItem({ ...minimal(), name }).expect(422);
      expect(errorsFor(res.body, 'name')).toEqual(['name is required']);
      expect(await listItems()).toEqual([]);
    });

    it('Scenario: Missing category', async () => {
      const { categoryId: _omit, ...body } = minimal();
      const res = await createItem(body).expect(422);
      expect(errorsFor(res.body, 'categoryId')).toEqual(['category is required']);
      expect(await listItems()).toEqual([]);
    });

    it('Scenario: Missing primary color', async () => {
      const { primaryColor: _omit, ...body } = minimal();
      const res = await createItem(body).expect(422);
      expect(errorsFor(res.body, 'primaryColor')).toEqual(['primary color is required']);
      expect(await listItems()).toEqual([]);
    });
  });

  describe('Requirement: Item colors are hex values', () => {
    it('Scenario: Six-digit hex colors', async () => {
      const res = await createItem({ ...minimal(), primaryColor: '#1F2A44', secondaryColor: '#C0A060' }).expect(201);
      expect(res.body).toMatchObject({ primaryColor: '#1f2a44', secondaryColor: '#c0a060' });
    });

    it('Scenario: Three-digit hex color', async () => {
      const res = await createItem({ ...minimal(), primaryColor: '#FA0' }).expect(201);
      expect(res.body.primaryColor).toBe('#ffaa00');
    });

    it.each(['navy', '#12345', '1f2a44', '#ggg', '#1f2a44cc'])('Scenario: Invalid hex color (%s)', async (color) => {
      const primary = await createItem({ ...minimal(), primaryColor: color }).expect(422);
      expect(errorsFor(primary.body, 'primaryColor')).toEqual([expect.stringContaining(`"${color}" is not a valid hex color`)]);
      const secondary = await createItem({ ...minimal(), secondaryColor: color }).expect(422);
      expect(errorsFor(secondary.body, 'secondaryColor')).toEqual([expect.stringContaining(`"${color}"`)]);
      expect(await listItems()).toEqual([]);
    });

    it('Scenario: No secondary color', async () => {
      const res = await createItem(minimal()).expect(201);
      expect(res.body.secondaryColor).toBeNull();
    });
  });

  describe('Requirement: Items reference existing categories and brands', () => {
    it('Scenario: Unknown category', async () => {
      const res = await createItem({ ...minimal(), categoryId: new Types.ObjectId().toString() }).expect(422);
      expect(res.body.detail).toBe('Category not found.');
      expect(errorsFor(res.body, 'categoryId')).toEqual(['category not found']);
      expect(await listItems()).toEqual([]);
    });

    it('Scenario: Unknown category (malformed id)', async () => {
      const res = await createItem({ ...minimal(), categoryId: 'nope' }).expect(422);
      expect(errorsFor(res.body, 'categoryId')).toEqual(['category not found']);
    });

    it('Scenario: Unknown brand', async () => {
      const res = await createItem({ ...minimal(), brandId: new Types.ObjectId().toString() }).expect(422);
      expect(res.body.detail).toBe('Brand not found.');
      expect(errorsFor(res.body, 'brandId')).toEqual(['brand not found']);
      expect(await listItems()).toEqual([]);
    });

    it('Scenario: Item without a brand', async () => {
      const res = await createItem({ ...minimal(), brandId: null }).expect(201);
      expect(res.body.brand).toBeNull();
    });
  });

  describe('Requirement: Seasons and occasions come from fixed lists', () => {
    it('Scenario: Selecting several seasons and occasions', async () => {
      const res = await createItem({ ...minimal(), seasons: ['fall', 'winter'], occasions: ['work'] }).expect(201);
      expect(res.body).toMatchObject({ seasons: ['fall', 'winter'], occasions: ['work'] });
    });

    it('Scenario: Unknown season or occasion', async () => {
      const season = await createItem({ ...minimal(), seasons: ['monsoon'] }).expect(422);
      expect(errorsFor(season.body, 'seasons')).toEqual([expect.stringContaining('"monsoon" is not allowed')]);
      const occasion = await createItem({ ...minimal(), occasions: ['party'] }).expect(422);
      expect(errorsFor(occasion.body, 'occasions')).toEqual([expect.stringContaining('"party" is not allowed')]);
      expect(await listItems()).toEqual([]);
    });

    it('Scenario: No seasons or occasions', async () => {
      const res = await createItem(minimal()).expect(201);
      expect(res.body).toMatchObject({ seasons: [], occasions: [] });
    });

    it('Scenario: Repeated value', async () => {
      const res = await createItem({ ...minimal(), seasons: ['winter', 'winter'] }).expect(201);
      expect(res.body.seasons).toEqual(['winter']);
    });
  });

  describe('Requirement: View the closet', () => {
    it('Scenario: Closet with items (newest first)', async () => {
      for (const name of ['First', 'Second', 'Third']) {
        await createItem({ ...minimal(), name }).expect(201);
      }
      const list = await listItems();
      expect(list.map((i: { name: string }) => i.name)).toEqual(['Third', 'Second', 'First']);
      expect(list[0]).toMatchObject({ category: { name: 'Blazers' }, brand: null, primaryColor: '#1f2a44' });
    });

    it('Scenario: Empty closet', async () => {
      expect(await listItems()).toEqual([]);
    });
  });

  describe("Requirement: View an item's details", () => {
    it('Scenario: Viewing an existing item', async () => {
      const { body } = await createItem({
        ...minimal(),
        brandId: uniqlo.id,
        secondaryColor: '#c0a060',
        seasons: ['fall'],
        occasions: ['work'],
        notes: 'Dry clean only',
      }).expect(201);
      const res = await http().get(`/api/items/${body.id}`).expect(200);
      expect(res.body).toEqual({
        id: body.id,
        name: 'Navy wool blazer',
        category: { id: blazers.id, name: 'Blazers', slot: 'outerwear' },
        brand: { id: uniqlo.id, name: 'Uniqlo' },
        primaryColor: '#1f2a44',
        secondaryColor: '#c0a060',
        seasons: ['fall'],
        occasions: ['work'],
        notes: 'Dry clean only',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it.each([
      ['an unknown id', new Types.ObjectId().toString()],
      ['a malformed id', 'nope'],
    ])('Scenario: Item does not exist (%s)', async (_label, id) => {
      const res = await http().get(`/api/items/${id}`).expect(404);
      expect(res.body).toMatchObject({ status: 404, detail: 'Item not found.' });
    });

    it('shows a dangling category or brand as null instead of failing', async () => {
      const { body } = await createItem({ ...minimal(), brandId: uniqlo.id }).expect(201);
      await t.connection.collection('categories').deleteMany({});
      await t.connection.collection('brands').deleteMany({});
      const res = await http().get(`/api/items/${body.id}`).expect(200);
      expect(res.body).toMatchObject({ category: null, brand: null });
    });
  });

  describe('Requirement: Rename a category / Rename a brand (items show the new name)', () => {
    it('Scenario: Renaming a category', async () => {
      const { body } = await createItem(minimal()).expect(201);
      await http().patch(`/api/categories/${blazers.id}`).send({ name: 'Jackets & Blazers' }).expect(200);
      expect((await http().get(`/api/items/${body.id}`)).body.category.name).toBe('Jackets & Blazers');
      expect((await listItems())[0].category.name).toBe('Jackets & Blazers');
    });

    it('Scenario: Renaming a brand', async () => {
      const levis = (await http().post('/api/brands').send({ name: 'Levis' }).expect(201)).body;
      const { body } = await createItem({ ...minimal(), brandId: levis.id }).expect(201);
      await http().patch(`/api/brands/${levis.id}`).send({ name: "Levi's" }).expect(200);
      expect((await http().get(`/api/items/${body.id}`)).body.brand.name).toBe("Levi's");
      expect((await listItems())[0].brand.name).toBe("Levi's");
    });
  });

  describe('Requirement: Edit an item', () => {
    it('Scenario: Successful edit', async () => {
      const { body } = await createItem({ ...minimal(), occasions: ['work'] }).expect(201);
      const res = await http()
        .patch(`/api/items/${body.id}`)
        .send({ name: 'Charcoal blazer', occasions: ['formal', 'casual'] })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Charcoal blazer', occasions: ['formal', 'casual'], primaryColor: '#1f2a44' });
      expect((await http().get(`/api/items/${body.id}`)).body).toMatchObject({ name: 'Charcoal blazer' });
    });

    it('Scenario: Removing optional values', async () => {
      const { body } = await createItem({ ...minimal(), brandId: uniqlo.id, secondaryColor: '#c0a060' }).expect(201);
      const res = await http().patch(`/api/items/${body.id}`).send({ brandId: null, secondaryColor: null }).expect(200);
      expect(res.body).toMatchObject({ brand: null, secondaryColor: null });
    });

    it('Scenario: Invalid edit', async () => {
      const { body: before } = await createItem(minimal()).expect(201);
      const res = await http()
        .patch(`/api/items/${before.id}`)
        .send({ name: 'Renamed', primaryColor: 'navy' })
        .expect(422);
      expect(errorsFor(res.body, 'primaryColor')).toHaveLength(1);
      const after = (await http().get(`/api/items/${before.id}`)).body;
      expect(after).toEqual(before);
    });

    it('rejects an edit that points at an unknown category and keeps the item', async () => {
      const { body: before } = await createItem(minimal()).expect(201);
      await http()
        .patch(`/api/items/${before.id}`)
        .send({ name: 'Renamed', categoryId: new Types.ObjectId().toString() })
        .expect(422);
      expect((await http().get(`/api/items/${before.id}`)).body).toEqual(before);
    });

    it.each([
      ['an unknown id', new Types.ObjectId().toString()],
      ['a malformed id', 'nope'],
    ])('Scenario: Editing an item that does not exist (%s)', async (_label, id) => {
      const res = await http().patch(`/api/items/${id}`).send({ name: 'X' }).expect(404);
      expect(res.body.detail).toBe('Item not found.');
    });
  });

  describe('Requirement: Delete an item', () => {
    it('Scenario: Confirmed delete', async () => {
      const { body } = await createItem({ ...minimal(), brandId: uniqlo.id }).expect(201);
      await http().delete(`/api/items/${body.id}`).expect(204, '');
      expect(await listItems()).toEqual([]);
      await http().get(`/api/items/${body.id}`).expect(404);
      const categories = (await http().get('/api/categories')).body;
      const brands = (await http().get('/api/brands')).body;
      expect(categories.map((c: { id: string }) => c.id)).toEqual([blazers.id]);
      expect(brands.map((b: { id: string }) => b.id)).toEqual([uniqlo.id]);
    });

    it.each([
      ['an unknown id', new Types.ObjectId().toString()],
      ['a malformed id', 'nope'],
    ])('Scenario: Deleting an item that does not exist (%s)', async (_label, id) => {
      const res = await http().delete(`/api/items/${id}`).expect(404);
      expect(res.body.detail).toBe('Item not found.');
    });
  });
});
