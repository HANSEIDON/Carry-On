import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
// Passport cover: engraved Roman capitals, and serif Hangul / Kanji (only the glyph subsets used are fetched).
import '@fontsource/cinzel/600.css';
import '@fontsource/noto-serif-kr/600.css';
import '@fontsource/noto-serif-jp/600.css';
import './styles/global.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
