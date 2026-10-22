import { useLayoutEffect, useState } from 'react';
import styles from './Coach.module.css';

export interface CoachStep {
  /** The control this step is about (looked up when the step shows). */
  target: () => HTMLElement | null;
  text: string;
}

/**
 * A short walk-through over a screen: the page dims except for one control, with a note beside
 * it saying what it does. Next, or Skip; it ends after the last step.
 */
export function Coach({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const last = step === steps.length - 1;

  useLayoutEffect(() => {
    const el = steps[step]?.target();
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, steps]);

  if (!rect) return null;
  const pad = 6;
  // The note goes below the control, or above it when the control sits low on the screen.
  const below = rect.bottom + 150 < window.innerHeight;
  const noteStyle = below ? { top: rect.bottom + pad + 10 } : { bottom: window.innerHeight - rect.top + pad + 10 };

  return (
    <div className={styles.coach} role="dialog" aria-modal="true" aria-label="How booking works">
      <div
        className={styles.hole}
        style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
      />
      <div className={styles.note} style={noteStyle}>
        <p className={styles.text}>{steps[step].text}</p>
        <div className={styles.foot}>
          <span className={styles.count}>
            {step + 1} / {steps.length}
          </span>
          <button className={styles.skip} onClick={onDone}>
            Skip
          </button>
          <button className={styles.next} onClick={() => (last ? onDone() : setStep(step + 1))}>
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
