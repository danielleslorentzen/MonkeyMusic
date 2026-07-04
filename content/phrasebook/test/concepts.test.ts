import { describe, expect, it } from 'vitest';
import { ConceptSchema } from '@lyd/schema';
import { abcToNotes } from '@lyd/notation';
import { BUNDLED_SPELLS } from '@lyd/spells';
import { CONCEPTS, getConcept } from '../src';

describe('phrasebook content', () => {
  it('has 30–50 concepts (P1 scope), all schema-valid with unique ids', () => {
    expect(CONCEPTS.length).toBeGreaterThanOrEqual(30);
    expect(CONCEPTS.length).toBeLessThanOrEqual(50);
    const ids = new Set<string>();
    for (const c of CONCEPTS) {
      const parsed = ConceptSchema.safeParse(c);
      expect(parsed.success, `${c.id}: ${parsed.success ? '' : parsed.error.issues[0]?.message}`).toBe(true);
      expect(ids.has(c.id), `duplicate ${c.id}`).toBe(false);
      ids.add(c.id);
    }
  });

  it('every sound example parses to at least two playable notes', () => {
    for (const c of CONCEPTS) {
      const notes = abcToNotes(c.abc);
      expect(notes.length, `${c.id} abc yielded ${notes.length} notes`).toBeGreaterThanOrEqual(2);
      for (const n of notes) {
        expect(n.midi, `${c.id} midi out of range`).toBeGreaterThanOrEqual(24);
        expect(n.midi, `${c.id} midi out of range`).toBeLessThanOrEqual(96);
      }
    }
  });

  it('every concept a bundled spell reveals (or is sealed by) exists', () => {
    for (const spell of BUNDLED_SPELLS) {
      for (const id of spell.reveal.concepts) {
        expect(getConcept(id), `${spell.id} reveals missing concept '${id}'`).toBeDefined();
      }
      if (spell.sealed_until_concept) {
        expect(
          getConcept(spell.sealed_until_concept),
          `${spell.id} sealed by missing concept`,
        ).toBeDefined();
      }
    }
  });

  it('keeps descriptions feeling-first and reasonably tight', () => {
    for (const c of CONCEPTS) {
      expect(c.feeling.length, `${c.id} feeling too long`).toBeLessThanOrEqual(90);
      expect(c.description.length, `${c.id} description too long`).toBeLessThanOrEqual(400);
    }
  });
});
