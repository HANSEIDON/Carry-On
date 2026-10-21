import { useEffect, useRef, useState, type ReactNode } from 'react';
import { COUNTRIES } from '../data/countries';
import { updateProfile, type Profile } from '../db/db';
import { DEFAULT_NATIONALITY } from '../domain/passport';
import styles from './PassportEditor.module.css';

/** Territories travel on another country's passport, so they aren't nationalities here. */
const NATIONALITIES = COUNTRIES.filter((c) => c.code !== 'GU' && c.code !== 'MP')
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

/** Passport photo proportions (35 × 45 mm), kept small: about 30 KB. */
const PHOTO_W = 350;
const PHOTO_H = 450;

/** Crop the middle of a picture to passport proportions and shrink it to a small JPEG. */
async function passportPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(PHOTO_W / bitmap.width, PHOTO_H / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  // Faces sit in the upper part of most photos: crop a little above center.
  canvas.getContext('2d')!.drawImage(bitmap, (PHOTO_W - w) / 2, Math.min(0, (PHOTO_H - h) * 0.35), w, h);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.84);
}

export function PassportEditor({
  profile,
  onChange,
  onClose,
  onSaved,
  children,
}: {
  profile: Profile;
  /** The data page as it will look, shown above the fields and updated as you type. */
  children?: ReactNode;
  /** Every edit as it happens, so the passport behind the sheet updates while typing. */
  onChange: (preview: Partial<Profile>) => void;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
}) {
  const [given, setGiven] = useState(profile.name);
  const [surname, setSurname] = useState(profile.surname ?? '');
  const [nationality, setNationality] = useState(profile.nationality ?? DEFAULT_NATIONALITY);
  const [photo, setPhoto] = useState(profile.photo);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange({ name: given.trim() || 'Traveler', surname: surname.trim(), nationality, photo });
  }, [given, surname, nationality, photo, onChange]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      setPhoto(await passportPhoto(f));
    } catch {
      alert('That picture could not be read. Try a JPEG or PNG.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const saved = await updateProfile({
      name: given.trim() || 'Traveler',
      surname: surname.trim(),
      nationality,
      photo,
    });
    onSaved(saved);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <form
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        aria-label="Edit passport"
      >
        {children && (
          <div className={styles.preview} aria-hidden="true">
            {children}
          </div>
        )}
        <h2 className={styles.title}>Passport details</h2>

        <div className={styles.photoRow}>
          <button type="button" className={styles.photo} onClick={() => file.current?.click()} disabled={busy}>
            {photo ? <img src={photo} alt="Passport photo" /> : <span>Add photo</span>}
          </button>
          <div className={styles.photoActions}>
            <button type="button" className={styles.link} onClick={() => file.current?.click()} disabled={busy}>
              {photo ? 'Change photo' : 'Choose a photo'}
            </button>
            {photo && (
              <button type="button" className={styles.link} onClick={() => setPhoto(undefined)}>
                Remove
              </button>
            )}
            <p className={styles.note}>Cropped to passport size and kept on this device.</p>
          </div>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        <label className={styles.field}>
          <span className="label">Given names</span>
          <input value={given} onChange={(e) => setGiven(e.target.value)} autoComplete="given-name" maxLength={30} />
        </label>
        <label className={styles.field}>
          <span className="label">Surname</span>
          <input value={surname} onChange={(e) => setSurname(e.target.value)} autoComplete="family-name" maxLength={30} />
        </label>
        <label className={styles.field}>
          <span className="label">Nationality</span>
          <select value={nationality} onChange={(e) => setNationality(e.target.value)}>
            {NATIONALITIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.note}>The machine-readable lines use Latin letters only.</p>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.save} disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
