# Carry On

> **Focus as a Journey, Miles into Baggage.**  
> An aviation-inspired deep work timer turning focus blocks into authentic airline flights.

Carry On reimagines the traditional Pomodoro technique as a genuine in-flight experience.

Instead of staring at a ticking countdown clock, you book a flight based on real great-circle flight times, select your seat, and tear off the boarding pass stub to initiate your session. During cruise, you focus within an acoustically synthesized cabin soundscape modeled after real aircraft recordings and acoustic research. Upon landing, you accumulate miles, receive official passport entry stamps, and collect destination stickers on a customizable 3D suitcase.

---

## 🎧 Acoustic Engineering & Scientific Foundation

Airplane cabin noise is often treated as generic white noise, yet prolonged exposure to raw low-frequency rumble causes cognitive fatigue and physiological stress. Carry On's sound architecture is engineered directly around environmental psychoacoustics and peer-reviewed research.

### 1. Low-Frequency Noise and Cognitive Fatigue

Commercial cabin noise carries the majority of its energy in the low-frequency spectrum (< 200 Hz). Empirical studies demonstrate that even when overall volume (dBA) remains constant, dominant low-frequency components significantly increase mental strain:

* **Attenuated Cortisol Decline & Sustained Stress**: Salivary free cortisol naturally decreases over the morning and afternoon. Under low-frequency noise (40 dBA), this natural circadian decline is significantly blunted in noise-sensitive individuals, maintaining elevated stress levels during work.  
  *Ref: [Persson Waye et al., Life Sciences (2002)](https://scholar.google.com/scholar?q=Low+frequency+noise+enhances+cortisol+among+noise+sensitive+subjects+during+work+performance)*
* **Impaired High-Demand Task Performance**: Low-frequency ventilation rumble impairs performance quality and reaction speed on demanding cognitive tasks requiring sustained attention and working memory.  
  *Ref: [Persson Waye, Rylander, Benton, Leventhall, Journal of Sound and Vibration (1997)](https://scholar.google.com/scholar?q=Effects+on+performance+and+work+quality+due+to+low+frequency+ventilation+noise)*

![Salivary Cortisol Response under Low-Frequency Noise](assets/persson-waye-cortisol.svg)

### 2. Focus Mode Filter Response

To counteract this fatigue while preserving the soothing masking properties of airflow, Carry On features a dedicated **Focus Mode**:

* **-7.0 dB Low-Shelf Attenuation (< 80 Hz)**: Dampens heavy sub-bass drone and chest-cavity resonance.
* **Smooth Transition Slope (80 Hz – 320 Hz)**: Centers at 160 Hz (-3.5 dB), eliminating engine hum without thinning out the background roar.
* **Preserved Mid-High Airflow (> 320 Hz)**: Full broadband masking remains intact to shield against ambient distractions.

![Focus Mode Filter Response](assets/cabin-focus-filter.svg)

| Frequency Band | Standard Cabin Mode | Focus Mode | Acoustic Effect |
|---|---|---|---|
| **< 80 Hz** | 0 dB (Flat reference) | **-7.0 dB** (Low-shelf) | Removes oppressive low-end rumble |
| **80 ~ 160 Hz** | 0 dB | **-3.5 to -6.6 dB** | Mitigates cortisol-triggering engine vibration |
| **> 320 Hz** | 0 dB | **0 dB** (Unchanged) | Retains optimal airflow and speech masking |

---

### 3. Real-Time Audio Synthesis & Aircraft Timbres

Repetitive audio loops create audible seams that unconsciously disrupt deep work. Carry On synthesizes cabin noise dynamically in real time via the **Web Audio API (`AudioWorklet`)**:

* **Turbulent Boundary Layer Simulation**: Continuous pink-noise generation mimicking the aerodynamic friction of air rushing over the fuselage.
* **Measured In-Flight Impulse Response (IR)**: Real cruise recordings of Airbus A320, Boeing 737, and Boeing 777 were analyzed to extract their median spectral contours, applied dynamically to the live noise generator.
* **Psychoacoustic Comfort Tuning**:
  * **Zero Pure Tones (Tonality)**: Engine hum is synthesized as narrowband noise rather than sine waves to prevent cognitive fixation.
  * **Controlled Sharpness & Roughness**: High-frequency glare and 1–300 Hz rapid fluctuations are strictly suppressed.
  * **Ultra-Slow Modulations**: Subtle variations occur over gentle 30+ second drift cycles.
* **Seat-Dependent Acoustics**:
  * **Front (Nose)**: Crisp, airy, quieter airflow body (0.82 relative loudness).
  * **Wing**: Deep engine drone balanced with structural roar (1.0 relative loudness).
  * **Rear (Tail)**: Heavy, dark low-end resonance (1.1 relative loudness).

---

### 4. Perceptual Loudness Normalization (ITU-R BS.1770)

In-flight announcements (PA) must blend gently into the background rather than startling the user:

* **ITU-R BS.1770 K-Weighting Standard**: Captain and cabin crew announcement clips are normalized using human perceptual loudness metering to maintain consistent voice prominence regardless of playback device.
* **Dual-Bus Independent Limiting**: Cabin ambience and PA announcements run on isolated audio buses with dedicated limiters. Announcements overlay smoothly over the cabin roar without unnatural compression ducking.
* **Evidence-Based Binaural Beats**: Optional focus tones remain disabled by default due to mixed clinical efficacy and phase-cancellation over speakers, offered strictly as an opt-in headphone feature.

---

## ✨ Features

### Great-Circle Flight Timer
Calculates authentic flight durations using real great-circle distance equations (e.g., Seoul to Tokyo in 2h, Paris in 12h). Users can search destinations by target focus duration or route, with circular "Scenic Flights" available for shorter 30–45 minute sessions.

### Interactive Boarding Pass
Authentic airline ticket typography featuring departure/arrival IATA codes, passenger name, seat assignment, and barcode. Dragging and tearing the perforated boarding pass stub triggers an audio-haptic feedback sequence that officially starts the focus timer.

### 3D Luggage & Collectible Decals
Interactive 3D luggage viewer powered by Three.js and React Three Fiber. Completing flights earns unique destination stickers that render onto the suitcase shell as decals. Accumulated flight miles can be spent in the in-app Duty Free shop on 30 different luggage types.

### ICAO 9303 Machine-Readable Passport
A digital passport matching international TD3 standard specifications (including 2×44 Machine Readable Zone with 7-3-1 check digit validation). Visas are stamped upon arrival with country-accurate date formats and custom ink formulations.

### Real-Time Day / Night Globe
A vector globe rendered via D3-geo that computes the astronomical subsolar point in real time, projecting accurate daytime and nighttime shadow boundaries (terminator line) along the active flight path.

### 100% Offline-First Architecture
All flight progress, passport records, and carrier data are stored locally in IndexedDB via Dexie.js, functioning without network connectivity.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite
* **State & Local DB**: Zustand, Dexie.js (IndexedDB)
* **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
* **Cartography**: D3-geo, TopoJSON, World Atlas
* **Audio Engine**: Web Audio API (`AudioWorklet`, `ConvolverNode`, `BiquadFilterNode`)
* **Audio Standards**: ITU-R BS.1770 Loudness Normalization
* **Test Suite**: Vitest (95 unit tests)

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18 or higher
* npm or pnpm

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/HANSEIDON/Carry-On.git
cd Carry-On

# Install dependencies
npm install

# Start local dev server (auto-opens browser)
npm run dev

# Expose to mobile device on the same local network
npm run dev:lan
```

> **Windows Tip**: Double-click `dev.bat` in the project root to run package verification and launch the dev server in one step.

### Verification & Testing

```bash
# Type check and build bundle
npm run build

# Run Vitest test suite
npm run test

# Verify codebase index consistency
npm run map:verify
```

---

## 💻 Desktop Application (.exe)

Carry On can be packaged as a standalone Windows desktop executable (`.exe`). An **Electron** packaging pipeline is recommended to ensure identical Web Audio API (`AudioWorklet`), WebGL, and IndexedDB performance.

### Packaging with Electron

1. **Install dev dependencies**:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. **Create main process entry (`electron/main.cjs`)**:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');

   function createWindow() {
     const win = new BrowserWindow({
       width: 1280,
       height: 860,
       minWidth: 420,
       minHeight: 700,
       title: 'Carry On',
       autoHideMenuBar: true,
       webPreferences: {
         contextIsolation: true,
         nodeIntegration: false
       }
     });

     win.loadFile(path.join(__dirname, '../dist/index.html'));
   }

   app.whenReady().then(createWindow);

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') app.quit();
   });
   ```

3. **Configure `package.json`**:
   ```json
   {
     "main": "electron/main.cjs",
     "scripts": {
       "electron:build": "npm run build && electron-builder --win"
     },
     "build": {
       "appId": "com.hanseidon.carryon",
       "productName": "Carry On",
       "directories": { "output": "release" },
       "win": { "target": ["nsis", "portable"] }
     }
   }
   ```

4. **Build the executable**:
   ```bash
   npm run electron:build
   ```
   The standalone installer and portable `.exe` will be generated under the `release/` directory.

---

## 📂 Project Architecture

```text
Carry-On/
├── assets/               # Technical diagram assets and research charts
├── docs/                 # Product specifications and voice manifests
├── public/
│   ├── audio/            # Aircraft IR acoustic filters & announcement audio
│   └── models/           # 3D carrier .glb models & optimized previews
├── src/
│   ├── audio/            # Real-time synthesis, IR filtering, and PA system
│   ├── components/       # Boarding pass, 3D suitcase, passport, and seatmap UI
│   ├── data/             # 68 international airports, airlines, and luggage slots
│   ├── db/               # Dexie IndexedDB schemas and persistence
│   ├── domain/           # Flight formulas, ICAO passport rules, and tiers
│   ├── map/              # D3-geo dynamic day/night vector globe
│   ├── screens/          # Flight lifecycle screens (Fly, Booking, Flight, etc.)
│   └── store/            # Zustand global stores and user settings
├── CORPUS_MAP.md         # Full codebase index and module router
└── vite.config.ts        # Vite configuration and build pipelines
```

---

## 📄 Academic References & Standards

* **Low frequency noise enhances cortisol among noise sensitive subjects during work performance**  
  Persson Waye, K., Bengtsson, J., Rylander, R., Hucklebridge, F., Evans, P., Clow, A. *Life Sciences*, 70(7), 745–758, 2002.  
  [Google Scholar](https://scholar.google.com/scholar?q=Low+frequency+noise+enhances+cortisol+among+noise+sensitive+subjects+during+work+performance)
* **Effects on performance and work quality due to low frequency ventilation noise**  
  Persson Waye, K., Rylander, R., Benton, S., Leventhall, H. G. *Journal of Sound and Vibration*, 205(4), 467–474, 1997.  
  [Google Scholar](https://scholar.google.com/scholar?q=Effects+on+performance+and+work+quality+due+to+low+frequency+ventilation+noise)
* **ITU-R BS.1770-4**: *Algorithms to measure audio programme loudness and true-peak audio level*, International Telecommunication Union.  
  [ITU Recommendation](https://www.itu.int/rec/R-REC-BS.1770)
