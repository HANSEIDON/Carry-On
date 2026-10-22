import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Box3, Euler, Group, Vector3, type Object3D } from 'three';
import { carrierModelUrl, carrierType } from '../data/carriers';
import type { StickerArt } from '../domain/stickerArt';
import { stickerFonts } from './stickerArtwork';
import { stickerDecals } from './stickerDecals';
import styles from './Carrier3D.module.css';

/**
 * One carrier in 3D: turn it with a finger, pinch to look closer. Lit by a small studio made of
 * light panels (generated here, no HDR download), standing on a soft contact shadow. It turns
 * slowly on its own. Screens mount it only while they're open, so one canvas at a time.
 */

/**
 * Stands a model up straight with its front toward +Z (`orient`: [pitch, yaw, roll] degrees,
 * from src/data/carriers.ts), scales its longest side to 1 and puts it on the floor.
 */
export function fitModel(scene: Object3D, orient?: [number, number, number]): Object3D {
  const turned = new Group();
  turned.add(scene.clone(true));
  if (orient) {
    const [pitch, yaw, roll] = orient.map((d) => (d * Math.PI) / 180);
    turned.quaternion.setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'));
  }
  turned.updateMatrixWorld(true);
  // Precise: a turned model's loose box is bigger than the model, which would float it and shrink it.
  const box = new Box3().setFromObject(turned, true);
  const size = box.getSize(new Vector3());
  // Longest side, so a wide bag lying down fits as well as an upright trolley.
  const scale = 1 / Math.max(size.x, size.y, size.z, 1e-6);
  const center = box.getCenter(new Vector3());
  const placed = new Group();
  placed.add(turned);
  placed.scale.setScalar(scale);
  placed.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  return placed;
}

/** The fonts printed on stickers, loaded before any sticker is drawn. */
function useStickerFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void stickerFonts().then(() => setReady(true));
  }, []);
  return ready;
}

function Model({ id, stickers }: { id: string; stickers: StickerArt[] }) {
  // useGLTF(path, draco, meshopt): our files are meshopt-compressed; no Draco (that would fetch a decoder).
  const { scene } = useGLTF(carrierModelUrl(id), false, true);
  const fitted = useMemo(() => fitModel(scene, carrierType(id).orient), [scene, id]);
  const fonts = useStickerFonts();
  // Stickers, projected onto the carrier's surface (they follow the model: same space, same group).
  const decals = useMemo(() => {
    if (!fonts || stickers.length === 0) return [];
    fitted.updateMatrixWorld(true);
    return stickerDecals(fitted, carrierType(id).slots, stickers);
  }, [fitted, id, stickers, fonts]);
  useEffect(
    () => () => {
      for (const d of decals) {
        d.geometry.dispose();
        (d.material as { dispose: () => void }).dispose();
      }
    },
    [decals],
  );
  return (
    <group>
      <primitive object={fitted} />
      {decals.map((d) => (
        <primitive key={d.uuid} object={d} />
      ))}
    </group>
  );
}

const NO_STICKERS: StickerArt[] = [];

/** Starts loading a carrier's model, so it's ready when it comes on (Duty Free's neighbours). */
export function preloadCarrier(id: string) {
  useGLTF.preload(carrierModelUrl(id), false, true);
}

type V3 = [number, number, number];

/** The studio (shared with the baked card pictures, carrierBake.ts). */
export const LIGHTS = {
  exposure: 1.25,
  ambient: 0.55,
  /** A key light from the front, a cool fill from behind on the other side. */
  key: { position: [2.2, 3, 2.4] as V3, intensity: 2.2 },
  fill: { position: [-2.5, 1.5, -1.5] as V3, intensity: 0.7, color: '#dfe8ff' },
  environment: 1.2,
};

/** Light panels around the carrier, facing it: what its glossy parts reflect. */
export const PANELS: { position: V3; scale: [number, number]; intensity: number; color?: string }[] = [
  { position: [0, 3, 2], scale: [4, 1.5], intensity: 2.2 },
  { position: [-3, 1.5, 1], scale: [3, 2], intensity: 1.2 },
  { position: [3, 1, -1], scale: [3, 2], intensity: 0.8 },
  { position: [0, -1, 2], scale: [4, 1], intensity: 0.5, color: '#f1ebe0' },
];

/** Where the camera stands: a little to the right, a little above, looking at the front. */
export const VIEW = { position: [1.05, 0.72, 2.15] as V3, target: 0.38, fov: 32 };

export function Carrier3D({
  id,
  stickers = NO_STICKERS,
  autoRotate = true,
  interactive = true,
  scrollable = false,
}: {
  /** Carrier type, as in src/data/carriers.ts. */
  id: string;
  /** Stickers stuck on it (src/db/db.ts `stickersOn`). */
  stickers?: StickerArt[];
  autoRotate?: boolean;
  /** Turn it with a finger, pinch to look closer. Off: it only turns on its own, and touches pass through. */
  interactive?: boolean;
  /** On a scrolling page: sideways drags turn it, up and down scrolls the page (no pinch). */
  scrollable?: boolean;
}) {
  return (
    <div className={styles.view} data-interactive={interactive} data-scrollable={scrollable}>
      <Canvas dpr={[1, 2]} camera={{ position: VIEW.position, fov: VIEW.fov }} gl={{ antialias: true, alpha: true, toneMappingExposure: LIGHTS.exposure }}>
        <ambientLight intensity={LIGHTS.ambient} />
        <directionalLight position={LIGHTS.key.position} intensity={LIGHTS.key.intensity} />
        <directionalLight position={LIGHTS.fill.position} intensity={LIGHTS.fill.intensity} color={LIGHTS.fill.color} />
        <Suspense fallback={null}>
          <Model id={id} stickers={stickers} />
          <ContactShadows key={id} position={[0, 0, 0]} opacity={0.35} scale={2.6} blur={2.4} far={1.2} frames={1} />
          <Environment resolution={256} environmentIntensity={LIGHTS.environment}>
            {PANELS.map((p, i) => (
              <Lightformer key={i} position={p.position} scale={p.scale} intensity={p.intensity} color={p.color} />
            ))}
          </Environment>
        </Suspense>
        <OrbitControls
          target={[0, VIEW.target, 0]}
          enablePan={false}
          enableRotate={interactive}
          enableZoom={interactive && !scrollable}
          minDistance={1.4}
          maxDistance={4}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2 - 0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
