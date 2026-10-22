import { useEffect, useState } from 'react';
import type { StickerArt } from '../domain/stickerArt';
import { stickerArtwork, stickerFonts } from './stickerArtwork';
import styles from './StickerPicture.module.css';

/** A sticker as a flat picture (the arrival screen): the same artwork that goes on the 3D carrier. */
export function StickerPicture({ art, width = 260 }: { art: StickerArt; width?: number }) {
  const [picture, setPicture] = useState<{ src: string; scale: number } | null>(null);

  useEffect(() => {
    let live = true;
    void stickerFonts().then(() => {
      if (!live) return;
      const drawn = stickerArtwork(art);
      setPicture({ src: drawn.canvas.toDataURL('image/png'), scale: drawn.scale });
    });
    return () => {
      live = false;
    };
    // One drawing per sticker (the parent may hand in a fresh object each render).
  }, [art.id, art.kind]);

  if (!picture) return <span className={styles.wait} style={{ width, height: width / 2 }} />;
  return <img className={styles.img} src={picture.src} alt="" style={{ width: width * picture.scale }} draggable={false} />;
}
