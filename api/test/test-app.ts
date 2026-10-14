import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

export interface TestApp {
  app: INestApplication<App>;
  connection: Connection;
  /** Removes every document from every collection, keeping indexes. */
  clear(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Boots the real AppModule against a fresh in-memory MongoDB. Each test file calls this
 * once in `beforeAll` (optionally adding test-only controllers), calls `clear()` in `afterEach`, and `close()` in `afterAll`.
 */
export async function createTestApp(options: { controllers?: Type[] } = {}): Promise<TestApp> {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('stylevault-test');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();
  const app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
  await app.init();

  const connection = app.get<Connection>(getConnectionToken());
  // Unique indexes are what enforce name uniqueness, so make sure they exist before tests run.
  await Promise.all(Object.values(connection.models).map((model) => model.syncIndexes()));

  return {
    app,
    connection,
    async clear() {
      const collections = await connection.db!.collections();
      await Promise.all(collections.map((collection) => collection.deleteMany({})));
    },
    async close() {
      await app.close();
      await mongo.stop();
    },
  };
}
