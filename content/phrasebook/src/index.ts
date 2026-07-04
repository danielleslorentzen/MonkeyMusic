export { CONCEPTS } from './concepts';

import type { Concept } from '@lyd/schema';
import { CONCEPTS } from './concepts';

const byId = new Map(CONCEPTS.map((c) => [c.id, c]));

export function getConcept(id: string): Concept | undefined {
  return byId.get(id);
}
