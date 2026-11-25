import * as React from 'react';
import type { ToggleDockAccent } from 'toggledock';

export interface EdgeMeshCanvasProps {
  activeAccent: ToggleDockAccent;
  parallaxContainerRef?: React.RefObject<HTMLElement | null>;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  depth: number;
}

interface PopNode {
  code: string;
  primary: boolean;
  pos: Vec3;
}

interface SignalRoute {
  points: Vec3[];
  phase: number;
  speed: number;
}

interface LiveThemeTokens {
  ruleSubtle: string;
  ruleStrong: string;
  inkMuted: string;
  inkSecondary: string;
  inkPrimary: string;
  accent: string;
  fontMono: string;
}

const DEG_TO_RAD = Math.PI / 180;

function latLonToVec3(latDeg: number, lonDeg: number, radius = 1): Vec3 {
  const lat = latDeg * DEG_TO_RAD;
  const lon = lonDeg * DEG_TO_RAD;
  const cosLat = Math.cos(lat);
  return {
    x: radius * cosLat * Math.sin(lon),
    y: radius * Math.sin(lat),
    z: radius * cosLat * Math.cos(lon),
  };
}

function slerpArc(a: Vec3, b: Vec3, segments: number, liftRadius = 1.045): Vec3[] {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const out: Vec3[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    let x: number;
    let y: number;
    let z: number;

    if (sinOmega < 0.0001) {
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t;
      z = a.z + (b.z - a.z) * t;
    } else {
      const w0 = Math.sin((1 - t) * omega) / sinOmega;
      const w1 = Math.sin(t * omega) / sinOmega;
      x = a.x * w0 + b.x * w1;
      y = a.y * w0 + b.y * w1;
      z = a.z * w0 + b.z * w1;
    }

    const arch = 1 + (liftRadius - 1) * Math.sin(Math.PI * t);
    const len = Math.hypot(x, y, z) || 1;
    out.push({
      x: (x / len) * arch,
      y: (y / len) * arch,
      z: (z / len) * arch,
    });
  }

  return out;
}

function buildLatitudeRings(): Vec3[][] {
  const latitudes = [-32, 0, 32];
  const segments = 48;
  return latitudes.map((lat) => {
    const ring: Vec3[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const lon = (i / segments) * 360 - 180;
      ring.push(latLonToVec3(lat, lon, 1));
    }
    return ring;
  });
}

function buildMeridianRings(): Vec3[][] {
  const longitudes = [0, 30, 60, 90, 120, 150];
  const segments = 48;
  return longitudes.map((lon) => {
    const ring: Vec3[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const theta = (i / segments) * Math.PI * 2;
      const lonRad = lon * DEG_TO_RAD;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      ring.push({
        x: cosT * Math.sin(lonRad),
        y: sinT,
        z: cosT * Math.cos(lonRad),
      });
    }
    return ring;
  });
}

const POP_NODES: ReadonlyArray<PopNode> = [
  // Primary Anycast hub POPs
  { code: 'iad', primary: true, pos: latLonToVec3(39, -77) },
  { code: 'fra', primary: true, pos: latLonToVec3(50, 9) },
  { code: 'nrt', primary: true, pos: latLonToVec3(36, 140) },
  { code: 'sjc', primary: true, pos: latLonToVec3(37, -122) },
  // Secondary regional edge POPs (18 total)
  { code: 'lhr', primary: false, pos: latLonToVec3(51, 0) },
  { code: 'ams', primary: false, pos: latLonToVec3(52, 5) },
  { code: 'cdg', primary: false, pos: latLonToVec3(48, 2) },
  { code: 'mad', primary: false, pos: latLonToVec3(40, -4) },
  { code: 'ord', primary: false, pos: latLonToVec3(42, -88) },
  { code: 'dfw', primary: false, pos: latLonToVec3(33, -97) },
  { code: 'sea', primary: false, pos: latLonToVec3(47, -122) },
  { code: 'yyz', primary: false, pos: latLonToVec3(43, -79) },
  { code: 'gru', primary: false, pos: latLonToVec3(-23, -46) },
  { code: 'jnb', primary: false, pos: latLonToVec3(-26, 28) },
  { code: 'bom', primary: false, pos: latLonToVec3(19, 73) },
  { code: 'sin', primary: false, pos: latLonToVec3(1, 104) },
  { code: 'icn', primary: false, pos: latLonToVec3(37, 127) },
  { code: 'syd', primary: false, pos: latLonToVec3(-34, 151) },
];

const LATITUDE_RINGS = buildLatitudeRings();
const MERIDIAN_RINGS = buildMeridianRings();

function findPop(code: string): Vec3 {
  const found = POP_NODES.find((node) => node.code === code);
  return found ? found.pos : { x: 0, y: 0, z: 1 };
}

const SIGNAL_ROUTES: ReadonlyArray<SignalRoute> = [
  { points: slerpArc(findPop('iad'), findPop('fra'), 36, 1.05), phase: 0.08, speed: 0.14 },
  { points: slerpArc(findPop('fra'), findPop('nrt'), 40, 1.055), phase: 0.36, speed: 0.12 },
  { points: slerpArc(findPop('nrt'), findPop('sjc'), 38, 1.05), phase: 0.62, speed: 0.13 },
  { points: slerpArc(findPop('sjc'), findPop('iad'), 32, 1.045), phase: 0.84, speed: 0.15 },
];

function readThemeTokens(): LiveThemeTokens {
  const styles = window.getComputedStyle(document.documentElement);
  const read = (token: string) => styles.getPropertyValue(token).trim();
  return {
    ruleSubtle: read('--rule-subtle'),
    ruleStrong: read('--rule-strong'),
    inkMuted: read('--ink-muted'),
    inkSecondary: read('--ink-secondary'),
    inkPrimary: read('--ink-primary'),
    accent: read('--accent'),
    fontMono: read('--font-mono'),
  };
}

function projectVec3(
  point: Vec3,
  cosY: number,
  sinY: number,
  cosX: number,
  sinX: number,
  cx: number,
  cy: number,
  radius: number,
): ProjectedPoint {
  const x1 = point.x * cosY + point.z * sinY;
  const z1 = -point.x * sinY + point.z * cosY;

  const y2 = point.y * cosX - z1 * sinX;
  const z2 = point.y * sinX + z1 * cosX;

  const fov = 3.8;
  const perspective = fov / (fov - z2);

  return {
    x: cx + x1 * radius * perspective,
    y: cy - y2 * radius * perspective,
    z: z2,
    depth: Math.max(0, Math.min(1, (z2 + 1) * 0.5)),
  };
}

export const EdgeMeshCanvas: React.FC<EdgeMeshCanvasProps> = ({
  activeAccent,
  parallaxContainerRef,
}) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const tokensRef = React.useRef<LiveThemeTokens | null>(null);
  const drawStaticRef = React.useRef<(() => void) | null>(null);

  // Re-read live CSS custom properties whenever Flagsmith updates theme_accent.
  React.useEffect(() => {
    const syncTokens = () => {
      tokensRef.current = readThemeTokens();
      drawStaticRef.current?.();
    };

    syncTokens();
    // Ensure a post-paint read after App's data-accent effect commits.
    const rafId = window.requestAnimationFrame(syncTokens);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName === 'data-accent') {
          syncTokens();
          break;
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent'],
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [activeAccent]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;

    let width = 320;
    let height = 192;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      const rect = wrapper.getBoundingClientRect();
      width = Math.max(180, Math.floor(rect.width));
      height = Math.max(160, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resizeCanvas();
    tokensRef.current = readThemeTokens();

    // Whisper-subtle pointer parallax (±0.14 rad max tilt)
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const parallaxTarget = parallaxContainerRef?.current ?? wrapper;

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion) {
        return;
      }
      const rect = parallaxTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      targetTiltY = Math.max(-1, Math.min(1, nx)) * 0.14;
      targetTiltX = Math.max(-1, Math.min(1, ny)) * 0.14;
    };

    const handlePointerLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
    };

    parallaxTarget.addEventListener('pointermove', handlePointerMove, { passive: true });
    parallaxTarget.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    let elapsedSeconds = 0;
    let rafHandle: number | null = null;
    let lastTimestamp: number | null = null;

    const renderFrame = (timeSec: number, isStatic: boolean) => {
      const tokens = tokensRef.current;
      if (!tokens || !tokens.accent || !tokens.ruleSubtle) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const radius = Math.min(width * 0.34, height * 0.41);

      const baseYaw = isStatic ? 0.62 : 0.62 + timeSec * 0.11;
      const breathPitch = isStatic ? 0 : Math.sin(timeSec * 0.45) * 0.024;
      const yaw = baseYaw + (isStatic ? 0 : currentTiltY);
      const pitch = -0.34 + breathPitch + (isStatic ? 0 : currentTiltX);

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);

      // Subtle architectural outer reticle ring + cardinal ticks
      const reticleR = radius * 1.15;
      ctx.save();
      ctx.strokeStyle = tokens.ruleSubtle;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, reticleR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = tokens.ruleStrong;
      ctx.globalAlpha = 0.8;
      const tickLen = 4;
      for (let i = 0; i < 4; i += 1) {
        const angle = (i * Math.PI) / 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(cx + cosA * (reticleR - tickLen), cy + sinA * (reticleR - tickLen));
        ctx.lineTo(cx + cosA * (reticleR + tickLen), cy + sinA * (reticleR + tickLen));
        ctx.stroke();
      }
      ctx.restore();

      // Draw wireframe latitude and meridian rings with depth-based alpha
      const drawRing = (ring: Vec3[]) => {
        let prev = projectVec3(ring[0], cosY, sinY, cosX, sinX, cx, cy, radius);
        for (let i = 1; i < ring.length; i += 1) {
          const next = projectVec3(ring[i], cosY, sinY, cosX, sinX, cx, cy, radius);
          const avgDepth = (prev.depth + next.depth) * 0.5;
          ctx.strokeStyle = avgDepth > 0.55 ? tokens.ruleStrong : tokens.ruleSubtle;
          ctx.lineWidth = avgDepth > 0.65 ? 0.9 : 0.7;
          ctx.globalAlpha = 0.16 + avgDepth * 0.58;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
          prev = next;
        }
      };

      for (const ring of LATITUDE_RINGS) {
        drawRing(ring);
      }
      for (const ring of MERIDIAN_RINGS) {
        drawRing(ring);
      }

      // Draw great-circle Anycast routes and flat-accent signal pulses
      const staticPhases = [0.34, 0.58, 0.42, 0.72];

      SIGNAL_ROUTES.forEach((route, routeIndex) => {
        const projected = route.points.map((pt) =>
          projectVec3(pt, cosY, sinY, cosX, sinX, cx, cy, radius),
        );

        // Base subtle route curve
        for (let i = 1; i < projected.length; i += 1) {
          const a = projected[i - 1];
          const b = projected[i];
          const avgDepth = (a.depth + b.depth) * 0.5;
          ctx.strokeStyle = tokens.ruleStrong;
          ctx.lineWidth = 0.85;
          ctx.globalAlpha = 0.18 + avgDepth * 0.44;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        // Sparse flat-color --accent signal pulse gliding along route
        const progress = isStatic
          ? staticPhases[routeIndex % staticPhases.length]
          : (route.phase + timeSec * route.speed) % 1;
        const maxIdx = projected.length - 1;
        const headFloat = progress * maxIdx;
        const headIdx = Math.min(maxIdx, Math.floor(headFloat));
        const trailSteps = 4;

        for (let s = 0; s < trailSteps; s += 1) {
          const idxB = headIdx - s;
          const idxA = idxB - 1;
          if (idxA < 0 || idxB > maxIdx) {
            continue;
          }
          const a = projected[idxA];
          const b = projected[idxB];
          const avgDepth = (a.depth + b.depth) * 0.5;
          const fade = 1 - s / trailSteps;
          ctx.strokeStyle = tokens.accent;
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = (0.14 + avgDepth * 0.86) * fade * 0.85;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        // Crisp flat lead pulse node
        const nextIdx = Math.min(maxIdx, headIdx + 1);
        const frac = headFloat - headIdx;
        const p0 = projected[headIdx];
        const p1 = projected[nextIdx];
        const px = p0.x + (p1.x - p0.x) * frac;
        const py = p0.y + (p1.y - p0.y) * frac;
        const pDepth = p0.depth + (p1.depth - p0.depth) * frac;

        ctx.fillStyle = tokens.accent;
        ctx.globalAlpha = 0.25 + pDepth * 0.75;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw 18 POP nodes sorted back-to-front
      const projectedNodes = POP_NODES.map((node) => ({
        node,
        proj: projectVec3(node.pos, cosY, sinY, cosX, sinX, cx, cy, radius),
      })).sort((a, b) => a.proj.z - b.proj.z);

      ctx.font = `600 10px ${tokens.fontMono || 'monospace'}`;
      ctx.textBaseline = 'middle';

      for (const { node, proj } of projectedNodes) {
        if (node.primary) {
          // Primary Anycast hub reticle + flat accent core
          if (proj.z > 0.05) {
            ctx.strokeStyle = tokens.accent;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2 + proj.depth * 0.45;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = proj.z > -0.1 ? tokens.accent : tokens.inkMuted;
          ctx.globalAlpha = 0.28 + proj.depth * 0.72;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 2.3, 0, Math.PI * 2);
          ctx.fill();

          if (proj.z > 0.14) {
            const labelAlpha = Math.min(1, (proj.z - 0.14) * 2.2);
            ctx.fillStyle = tokens.inkPrimary;
            ctx.globalAlpha = labelAlpha * 0.9;
            ctx.fillText(node.code.toUpperCase(), proj.x + 8, proj.y);
          }
        } else {
          // Secondary regional edge POP dot
          ctx.fillStyle = proj.z > 0 ? tokens.inkSecondary : tokens.inkMuted;
          ctx.globalAlpha = 0.18 + proj.depth * 0.56;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    };

    const drawStatic = () => {
      renderFrame(elapsedSeconds, reducedMotion);
    };
    drawStaticRef.current = drawStatic;

    const stopLoop = () => {
      if (rafHandle !== null) {
        window.cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
      lastTimestamp = null;
    };

    const tick = (timestamp: number) => {
      if (reducedMotion || document.hidden) {
        stopLoop();
        return;
      }

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const dt = Math.min(0.05, Math.max(0, (timestamp - lastTimestamp) / 1000));
      lastTimestamp = timestamp;
      elapsedSeconds += dt;

      const damp = 1 - Math.exp(-5.5 * dt);
      currentTiltX += (targetTiltX - currentTiltX) * damp;
      currentTiltY += (targetTiltY - currentTiltY) * damp;

      renderFrame(elapsedSeconds, false);
      rafHandle = window.requestAnimationFrame(tick);
    };

    const startLoopIfAllowed = () => {
      if (reducedMotion) {
        stopLoop();
        renderFrame(0, true);
        return;
      }
      if (document.hidden) {
        stopLoop();
        return;
      }
      if (rafHandle === null) {
        lastTimestamp = null;
        rafHandle = window.requestAnimationFrame(tick);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoopIfAllowed();
      }
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        currentTiltX = 0;
        currentTiltY = 0;
        targetTiltX = 0;
        targetTiltY = 0;
      }
      startLoopIfAllowed();
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      renderFrame(elapsedSeconds, reducedMotion);
    });
    resizeObserver.observe(wrapper);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    motionQuery.addEventListener('change', handleMotionPreferenceChange);

    startLoopIfAllowed();

    return () => {
      drawStaticRef.current = null;
      stopLoop();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motionQuery.removeEventListener('change', handleMotionPreferenceChange);
      parallaxTarget.removeEventListener('pointermove', handlePointerMove);
      parallaxTarget.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [parallaxContainerRef]);

  return (
    <div
      data-interactive="true"
      className="group/mesh relative border-b border-rule-subtle transition-colors duration-200 hover:border-rule-strong"
    >
      <div className="flex items-center justify-between gap-2 px-6 pt-4 pb-2">
        <span className="font-mono text-micro uppercase text-ink-muted tabular-nums">
          MESH TOPOLOGY · 18 POPS
        </span>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <span className="font-mono text-micro uppercase text-accent tabular-nums">
            {activeAccent}
          </span>
        </div>
      </div>

      <div className="relative px-4">
        <span
          aria-hidden="true"
          className="specular-beam absolute inset-x-4 top-0 opacity-25 transition-opacity duration-200 group-hover/mesh:opacity-100"
        />
        <div ref={wrapperRef} className="relative h-48 w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Interactive 3D wireframe lattice of Meridian Cloud's 18 Anycast edge POPs with live accent signal routes between iad, fra, nrt, and sjc"
            className="block h-full w-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-6 pt-2 pb-4 font-mono text-micro uppercase text-ink-muted tabular-nums">
        <span>IAD · FRA · NRT · SJC</span>
        <span className="text-ink-secondary">4 ANYCAST ROUTES</span>
      </div>
    </div>
  );
};
