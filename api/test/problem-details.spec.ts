import { Body, ConflictException, Controller, Get, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import request from 'supertest';
import { ProblemException } from '../src/common/problem.exception';
import { createTestApp, TestApp } from './test-app';

class ProbeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  count: number;
}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() dto: ProbeDto) {
    return dto;
  }

  @Get('missing')
  missing() {
    throw new NotFoundException('Thing not found.');
  }

  @Get('conflict')
  conflict() {
    throw new ConflictException('Thing already exists.');
  }

  @Get('in-use')
  inUse() {
    throw new ProblemException(HttpStatus.CONFLICT, 'Thing is used by 3 items.', { itemCount: 3 });
  }
}

describe('Problem Details errors', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ controllers: [ProbeController] });
  });
  afterEach(() => t.clear());
  afterAll(() => t.close());

  const http = () => request(t.app.getHttpServer());

  it('returns 400 for a body that is not valid JSON', async () => {
    const res = await http()
      .post('/api/probe')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: expect.any(String),
    });
  });

  it('returns 422 with field errors when a DTO rule fails', async () => {
    const res = await http()
      .post('/api/probe')
      .send({ name: '', count: 'many' })
      .expect(422)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body).toMatchObject({ type: 'about:blank', title: 'Unprocessable Entity', status: 422 });
    expect(res.body.detail).toEqual(expect.any(String));
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'name', message: expect.stringContaining('name') },
        { field: 'count', message: expect.stringContaining('count') },
      ]),
    );
  });

  it('accepts a valid body', async () => {
    await http().post('/api/probe').send({ name: 'ok', count: 1 }).expect(201, { name: 'ok', count: 1 });
  });

  it('renders a thrown 404 as Problem Details', async () => {
    const res = await http()
      .get('/api/probe/missing')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body).toEqual({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Thing not found.' });
  });

  it('renders a thrown 409 as Problem Details', async () => {
    const res = await http()
      .get('/api/probe/conflict')
      .expect(409)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body).toEqual({ type: 'about:blank', title: 'Conflict', status: 409, detail: 'Thing already exists.' });
  });

  it('adds extension members such as itemCount', async () => {
    const res = await http().get('/api/probe/in-use').expect(409);
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'Thing is used by 3 items.',
      itemCount: 3,
    });
  });
});
