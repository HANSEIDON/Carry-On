import { useState } from 'react';
import { carrierThumbUrl } from '../data/carriers';
import styles from './CarrierThumb.module.css';

/**
 * A still picture of a carrier for cards, baked from its 3D model (src/components/carrierBake.ts).
 * `silhouette`: only its shape, in shadow, for ones you haven't found yet.
 */
export function CarrierThumb({ id, alt, silhouette = false }: { id: string; alt: string; silhouette?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={styles.frame} data-loaded={loaded}>
      <img
        className={styles.img}
        data-silhouette={silhouette}
        src={carrierThumbUrl(id)}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
