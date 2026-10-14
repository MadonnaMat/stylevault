import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateItemDto } from './create-item.dto';
import { UpdateItemDto } from './update-item.dto';

const categoryId = '64b000000000000000000001';

async function check<T extends object>(cls: new () => T, plain: object) {
  const dto = plainToInstance(cls, plain);
  const errors = await validate(dto, { whitelist: true });
  return { dto, errors: errors.flatMap((e) => Object.values(e.constraints ?? {}).map((m) => [e.property, m])) };
}

const valid = { name: 'Navy wool blazer', categoryId, primaryColor: '#1f2a44' };

describe('CreateItemDto transforms', () => {
  it('trims the name and notes', async () => {
    const { dto, errors } = await check(CreateItemDto, { ...valid, name: '  Blazer  ', notes: '  dry clean only \n' });
    expect(errors).toEqual([]);
    expect(dto.name).toBe('Blazer');
    expect(dto.notes).toBe('dry clean only');
  });

  it('normalizes hex colors to lowercase #rrggbb', async () => {
    const { dto, errors } = await check(CreateItemDto, { ...valid, primaryColor: '#FA0', secondaryColor: '#C0A060' });
    expect(errors).toEqual([]);
    expect(dto.primaryColor).toBe('#ffaa00');
    expect(dto.secondaryColor).toBe('#c0a060');
  });

  it('removes repeated seasons and occasions', async () => {
    const { dto, errors } = await check(CreateItemDto, {
      ...valid,
      seasons: ['winter', 'fall', 'winter'],
      occasions: ['work', 'work'],
    });
    expect(errors).toEqual([]);
    expect(dto.seasons).toEqual(['winter', 'fall']);
    expect(dto.occasions).toEqual(['work']);
  });

  it.each(['navy', '#12345', '1f2a44', '#ggg', '#1f2a44cc'])('rejects the color %s', async (color) => {
    const { errors } = await check(CreateItemDto, { ...valid, primaryColor: color });
    expect(errors).toEqual([['primaryColor', `primary color "${color}" is not a valid hex color (use #RGB or #RRGGBB)`]]);
  });

  it('names the values that are not allowed', async () => {
    const { errors } = await check(CreateItemDto, { ...valid, seasons: ['monsoon', 'fall'], occasions: ['party'] });
    expect(errors).toEqual([
      ['seasons', expect.stringMatching(/^season "monsoon" is not allowed/)],
      ['occasions', expect.stringMatching(/^occasion "party" is not allowed/)],
    ]);
  });

  it('reports missing required fields', async () => {
    const { errors } = await check(CreateItemDto, { name: '  ' });
    expect(errors).toEqual([
      ['name', 'name is required'],
      ['categoryId', 'category is required'],
      ['primaryColor', 'primary color is required'],
    ]);
  });
});

describe('UpdateItemDto', () => {
  it('accepts null for brand, secondary color, and notes', async () => {
    const { errors } = await check(UpdateItemDto, { brandId: null, secondaryColor: null, notes: null });
    expect(errors).toEqual([]);
  });

  it('rejects null for required fields', async () => {
    const { errors } = await check(UpdateItemDto, { name: null, categoryId: null, primaryColor: null, seasons: null });
    expect(errors.map(([field]) => field)).toEqual(['name', 'categoryId', 'primaryColor', 'seasons']);
  });

  it('accepts an empty body', async () => {
    const { errors } = await check(UpdateItemDto, {});
    expect(errors).toEqual([]);
  });
});
