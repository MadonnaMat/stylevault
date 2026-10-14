import { HttpStatus } from '@nestjs/common';
import { ProblemException } from './problem.exception';

/** 409 for deleting a category or brand that items still use, with an `itemCount` member. */
export function inUse(resource: string, name: string, itemCount: number): ProblemException {
  const items = itemCount === 1 ? '1 item' : `${itemCount} items`;
  return new ProblemException(HttpStatus.CONFLICT, `${resource} "${name}" is used by ${items}.`, { itemCount });
}
