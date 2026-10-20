import type { LatLon } from '../domain/types';

/**
 * Renders NASA Blue Marble (day) and Black Marble (night) onto an orthographic globe with WebGL,
 * blending them per pixel by the real sun position. The math matches d3's geoOrthographic with
 * rotate([-lon, -lat]), so the SVG route and labels drawn by d3 line up exactly.
 */

export interface GlobeView {
  /** Globe center in degrees (the point facing the viewer). */
  center: [number, number];
  /** d3 projection scale and translate, in SVG viewBox units. */
  scale: number;
  translate: [number, number];
  width: number;
  height: number;
  sun: LatLon;
}

const DAY_URL = `${import.meta.env.BASE_URL}maps/earth-day.jpg`;
const NIGHT_URL = `${import.meta.env.BASE_URL}maps/earth-night.jpg`;
const TEXTURE_SIZE = 4096;

/** Matches the map background so the JPEG needs no alpha. */
const BG = [0.0196, 0.0314, 0.051];

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform vec2 uSize;
uniform vec2 uTranslate;
uniform float uScale;
uniform vec3 uC;
uniform vec3 uE;
uniform vec3 uN;
uniform vec3 uSun;
uniform vec3 uBg;
const float PI = 3.14159265359;

void main() {
  float X = gl_FragCoord.x;
  float Y = uSize.y - gl_FragCoord.y;
  float x = (X - uTranslate.x) / uScale;
  float y = (uTranslate.y - Y) / uScale;
  float r = sqrt(x * x + y * y);
  if (r > 1.0 + 2.0 / uScale) { gl_FragColor = vec4(uBg, 1.0); return; }

  float d = sqrt(max(0.0, 1.0 - r * r));
  vec3 p = normalize(x * uE + y * uN + d * uC);
  float lon = atan(p.y, p.x);
  float lat = asin(clamp(p.z, -1.0, 1.0));
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);

  vec3 day = texture2D(uDay, uv).rgb;
  vec3 night = texture2D(uNight, uv).rgb;

  // Dim the day side a touch for the dark UI; let city lights glow a bit warmer and brighter.
  day = pow(day, vec3(1.08)) * 0.9;
  night = night * vec3(1.45, 1.35, 1.2);

  // Twilight band roughly 7 degrees wide around the terminator.
  float sunDot = dot(p, uSun);
  float light = smoothstep(-0.1, 0.06, sunDot);
  vec3 col = mix(night, day, light);

  // Limb darkening and a thin blue atmosphere at the edge.
  col *= mix(0.6, 1.0, smoothstep(0.0, 0.4, d));
  col += vec3(0.25, 0.45, 0.95) * pow(1.0 - d, 4.0) * 0.45;

  // One-pixel antialiased rim.
  float a = clamp((1.0 - r) * uScale, 0.0, 1.0);
  gl_FragColor = vec4(mix(uBg, col, a), 1.0);
}
`;

class GlobeRenderer {
  private canvas = document.createElement('canvas');
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private ready: Promise<boolean> | null = null;
  private lastUrl: string | null = null;

  /** Loads textures once. Resolves false when WebGL or the images aren't available (vector map stays). */
  init(): Promise<boolean> {
    this.ready ??= this.setup().catch(() => false);
    return this.ready;
  }

  /** Renders the globe and returns an object URL for an <image>, or null if unavailable. */
  async render(view: GlobeView, pixelRatio: number): Promise<string | null> {
    if (!(await this.init())) return null;
    const gl = this.gl!;
    const w = Math.round(view.width * pixelRatio);
    const h = Math.round(view.height * pixelRatio);
    this.canvas.width = w;
    this.canvas.height = h;
    gl.viewport(0, 0, w, h);

    const [lonC, latC] = view.center.map((v) => (v * Math.PI) / 180);
    const u = (name: string) => gl.getUniformLocation(this.program!, name);
    gl.uniform2f(u('uSize'), w, h);
    gl.uniform2f(u('uTranslate'), view.translate[0] * pixelRatio, view.translate[1] * pixelRatio);
    gl.uniform1f(u('uScale'), view.scale * pixelRatio);
    gl.uniform3f(u('uC'), Math.cos(latC) * Math.cos(lonC), Math.cos(latC) * Math.sin(lonC), Math.sin(latC));
    gl.uniform3f(u('uE'), -Math.sin(lonC), Math.cos(lonC), 0);
    gl.uniform3f(u('uN'), -Math.sin(latC) * Math.cos(lonC), -Math.sin(latC) * Math.sin(lonC), Math.cos(latC));
    const sLat = (view.sun.lat * Math.PI) / 180;
    const sLon = (view.sun.lon * Math.PI) / 180;
    gl.uniform3f(u('uSun'), Math.cos(sLat) * Math.cos(sLon), Math.cos(sLat) * Math.sin(sLon), Math.sin(sLat));
    gl.uniform3f(u('uBg'), BG[0], BG[1], BG[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const blob = await new Promise<Blob | null>((resolve) => this.canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return null;
    if (this.lastUrl) URL.revokeObjectURL(this.lastUrl);
    this.lastUrl = URL.createObjectURL(blob);
    return this.lastUrl;
  }

  private async setup(): Promise<boolean> {
    const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
    if (!gl || gl.getParameter(gl.MAX_TEXTURE_SIZE) < TEXTURE_SIZE) return false;
    this.gl = gl;

    const program = gl.createProgram()!;
    for (const [type, src] of [
      [gl.VERTEX_SHADER, VERT],
      [gl.FRAGMENT_SHADER, FRAG],
    ] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
    gl.useProgram(program);
    this.program = program;

    // Full-screen quad.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const [day, night] = await Promise.all([loadImage(DAY_URL), loadImage(NIGHT_URL)]);
    this.texture(0, day, 'uDay');
    this.texture(1, night, 'uNight');
    return true;
  }

  private texture(unit: number, img: HTMLImageElement, uniform: string) {
    const gl = this.gl!;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    // Wrap around the date line; no mipmaps so the seam stays invisible.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(this.program!, uniform), unit);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export const globeRenderer = new GlobeRenderer();
