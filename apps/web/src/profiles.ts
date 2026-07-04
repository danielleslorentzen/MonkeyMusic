import type { ProfileRow } from '@lyd/schema';
import { getMeta, insertProfile, listProfiles, setMeta, setProfilePin } from './db/repo';

/**
 * Local profiles + adult gate (TDD §5.4). Everything is on-device; the
 * "gate" is a PIN hash, not an account. Kid profiles can never be the
 * gate-holder. In P0/P1 the whole app is offline, so the gate's job is
 * (a) keeping kids inside the kid profile and (b) being the sticky switch
 * that any future connected feature must sit behind.
 */

const PIN_SALT = 'lyd-adult-gate-v1';

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${PIN_SALT}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Ensure a default adult profile exists; return all profiles + current id. */
export async function bootstrapProfiles(): Promise<{
  profiles: ProfileRow[];
  currentId: string;
}> {
  let profiles = await listProfiles();
  if (profiles.length === 0) {
    await insertProfile({ name: 'You', kind: 'adult', emoji: '🎧' });
    profiles = await listProfiles();
  }
  let currentId = await getMeta('current_profile');
  if (!currentId || !profiles.some((p) => p.id === currentId)) {
    currentId = profiles[0].id;
    await setMeta('current_profile', currentId);
  }
  return { profiles, currentId };
}

export async function switchProfile(id: string): Promise<void> {
  await setMeta('current_profile', id);
}

export async function createKidProfile(name: string, emoji: string): Promise<void> {
  await insertProfile({ name, kind: 'kid', emoji });
}

export async function setAdultPin(profileId: string, pin: string): Promise<void> {
  await setProfilePin(profileId, await hashPin(pin));
}

export async function verifyPin(profile: ProfileRow, pin: string): Promise<boolean> {
  if (!profile.pin_hash) return true; // no PIN set yet — gate open by choice
  return (await hashPin(pin)) === profile.pin_hash;
}
