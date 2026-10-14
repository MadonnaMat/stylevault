import { INestApplication } from '@nestjs/common';
import { ProblemDetailsFilter } from './common/problem-details.filter';
import { createValidationPipe } from './common/validation';

/** Global HTTP setup, shared by main.ts and the API tests so both run the same pipeline. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
  return app;
}
