import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileRow } from '@lyd/schema';
import {
  bootstrapProfiles, createKidProfile, setAdultPin, switchProfile, verifyPin,
} from '../../profiles';
import { useAppStore, useCurrentProfile } from '../../store';

/**
 * Profiles + the adult gate (TDD §5.4). Switching INTO an adult profile that
 * has a PIN requires the PIN; kid profiles switch freely (they're the safe
 * default). The gate is local — a PIN hash, not an account.
 */
export function ProfilesScreen() {
  const { t } = useTranslation();
  const profiles = useAppStore((s) => s.profiles);
  const setProfiles = useAppStore((s) => s.setProfiles);
  const navigate = useAppStore((s) => s.navigate);
  const current = useCurrentProfile();

  const [gateFor, setGateFor] = useState<ProfileRow | null>(null);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const [addingKid, setAddingKid] = useState(false);
  const [kidName, setKidName] = useState('');
  const [kidEmoji, setKidEmoji] = useState('🐵');
  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  const KID_EMOJI = ['🐵', '🦊', '🐸', '🐙', '🦕', '🐝'];

  async function refresh() {
    const { profiles: p, currentId } = await bootstrapProfiles();
    setProfiles(p, currentId);
  }

  async function requestSwitch(p: ProfileRow) {
    if (p.id === current?.id) return;
    // Gate: entering an adult profile (from anywhere) requires its PIN.
    if (p.kind === 'adult' && p.pin_hash) {
      setGateFor(p);
      setPinEntry('');
      setPinError(false);
      return;
    }
    await switchProfile(p.id);
    await refresh();
    navigate('home');
  }

  async function submitPin() {
    if (!gateFor) return;
    if (await verifyPin(gateFor, pinEntry)) {
      await switchProfile(gateFor.id);
      setGateFor(null);
      await refresh();
      navigate('home');
    } else {
      setPinError(true);
      setPinEntry('');
    }
  }

  async function addKid() {
    if (!kidName.trim()) return;
    await createKidProfile(kidName.trim(), kidEmoji);
    setAddingKid(false);
    setKidName('');
    await refresh();
  }

  async function savePin() {
    if (!current || current.kind !== 'adult' || newPin.length < 4) return;
    await setAdultPin(current.id, newPin);
    setSettingPin(false);
    setNewPin('');
    await refresh();
  }

  if (gateFor) {
    return (
      <div className="screen">
        <h1 className="screen-title">🔒 {t('profiles.gateTitle', { name: gateFor.name })}</h1>
        <p className="hint">{t('profiles.gateHint')}</p>
        <input
          className="text-input pin-input"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pinEntry}
          maxLength={8}
          onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && void submitPin()}
        />
        {pinError && <p className="error-text">{t('profiles.wrongPin')}</p>}
        <div className="button-row">
          <button className="btn btn-primary" onClick={() => void submitPin()}>
            {t('profiles.unlock')}
          </button>
          <button className="btn btn-ghost" onClick={() => setGateFor(null)}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{t('profiles.title')}</h1>
      <p className="hint">{t('profiles.hint')}</p>

      <div className="profile-grid">
        {profiles.map((p) => (
          <button
            key={p.id}
            className={`profile-card ${p.id === current?.id ? 'profile-current' : ''}`}
            onClick={() => void requestSwitch(p)}
          >
            <span className="profile-emoji">{p.emoji}</span>
            <span className="profile-name">{p.name}</span>
            <span className="item-sub">
              {t(`profiles.kind.${p.kind}`)}
              {p.kind === 'adult' && p.pin_hash ? ' 🔒' : ''}
            </span>
          </button>
        ))}
      </div>

      {current?.kind === 'adult' && (
        <>
          {!addingKid ? (
            <button className="btn btn-ghost" onClick={() => setAddingKid(true)}>
              ＋ {t('profiles.addKid')}
            </button>
          ) : (
            <div className="journal-input">
              <input
                className="text-input"
                placeholder={t('profiles.kidNamePlaceholder')}
                value={kidName}
                maxLength={20}
                onChange={(e) => setKidName(e.target.value)}
              />
              <div className="chip-row">
                {KID_EMOJI.map((e) => (
                  <button
                    key={e}
                    className={`chip ${e === kidEmoji ? 'chip-active' : ''}`}
                    onClick={() => setKidEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="button-row">
                <button className="btn btn-primary" disabled={!kidName.trim()} onClick={() => void addKid()}>
                  {t('profiles.create')}
                </button>
                <button className="btn btn-ghost" onClick={() => setAddingKid(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {!settingPin ? (
            <button className="btn btn-ghost" onClick={() => setSettingPin(true)}>
              🔑 {current.pin_hash ? t('profiles.changePin') : t('profiles.setPin')}
            </button>
          ) : (
            <div className="journal-input">
              <p className="hint">{t('profiles.pinHint')}</p>
              <input
                className="text-input pin-input"
                type="password"
                inputMode="numeric"
                value={newPin}
                maxLength={8}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              />
              <div className="button-row">
                <button className="btn btn-primary" disabled={newPin.length < 4} onClick={() => void savePin()}>
                  {t('profiles.savePin')}
                </button>
                <button className="btn btn-ghost" onClick={() => setSettingPin(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
