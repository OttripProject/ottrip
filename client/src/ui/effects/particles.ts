import { colors } from "@/ui/tokens/colors";
import { zIndex } from "@/ui/tokens/zIndex";

type Shape = "dot" | "rect" | "spark";

type BurstOptions = {
  count?: number;
  colors?: readonly string[];
  power?: number;
  spread?: number;
  dir?: number;
  gravity?: number;
  drag?: number;
  size?: number;
  shapes?: readonly Shape[];
  life?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  r: number;
  rot: number;
  vr: number;
  c: string;
  shape: Shape;
  life: number;
  max: number;
};

const burstPresets = {
  confetti: { count: 26, power: 8 },
  poof: {
    count: 14,
    colors: colors.dust,
    power: 3.2,
    spread: Math.PI * 2,
    gravity: -0.02,
    drag: 0.92,
    size: 5,
    shapes: ["dot"],
    life: 650,
  },
  sparkle: {
    count: 16,
    colors: colors.sparkle,
    power: 5,
    spread: Math.PI * 2,
    gravity: 0.05,
    drag: 0.94,
    shapes: ["spark", "spark", "dot"],
    life: 900,
  },
  check: {
    count: 8,
    colors: colors.checkBurst,
    power: 3.4,
    spread: Math.PI * 2,
    gravity: 0,
    drag: 0.88,
    size: 3,
    shapes: ["dot", "spark"],
    life: 450,
  },
  complete: { count: 30, power: 8 },
} satisfies Record<string, BurstOptions>;

export type BurstEffect = keyof typeof burstPresets;

export const TOAST_ELEMENT_ID = "ottrip-toast";

const DEFAULT_SHAPES: Shape[] = ["dot", "rect", "rect", "spark"];
const ORIGIN_TTL = 2500;

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let parts: Particle[] = [];
let running = false;
let dpr = 1;
let last = 0;
let lastPoint: { x: number; y: number; t: number } | null = null;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    e => {
      lastPoint = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    true,
  );
}

function fit() {
  if (!canvas) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

function mount() {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:${zIndex.webModal + 1}`;
    ctx = canvas.getContext("2d");
    window.addEventListener("resize", fit);
  }
  if (!canvas.parentNode) {
    document.body.appendChild(canvas);
    fit();
  }
}

function origin() {
  if (lastPoint && Date.now() - lastPoint.t < ORIGIN_TTL) return lastPoint;
  const toast = document.getElementById(TOAST_ELEMENT_ID);
  if (toast) {
    const r = toast.getBoundingClientRect();
    return { x: r.left + 24, y: r.top };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function burst(x: number, y: number, o: BurstOptions) {
  mount();
  const n = o.count ?? 22;
  const cols = o.colors ?? colors.confetti;
  const pow = o.power ?? 7;
  const spread = o.spread ?? Math.PI * 1.1;
  const dir = o.dir ?? -Math.PI / 2;
  const shapes = o.shapes ?? DEFAULT_SHAPES;
  for (let i = 0; i < n; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const v = pow * (0.55 + Math.random() * 0.6);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      g: o.gravity ?? 0.26,
      drag: o.drag ?? 0.965,
      r: (o.size ?? 4) * (0.7 + Math.random() * 0.7),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      c: cols[i % cols.length],
      shape: shapes[i % shapes.length],
      life: 0,
      max: (o.life ?? 900) * (0.8 + Math.random() * 0.4),
    });
  }
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }
}

function draw(c: CanvasRenderingContext2D, p: Particle) {
  if (p.shape === "dot") {
    c.beginPath();
    c.arc(0, 0, p.r * 0.8, 0, Math.PI * 2);
    c.fill();
  } else if (p.shape === "rect") {
    const w = p.r * 1.8;
    const h = p.r * 0.9;
    c.beginPath();
    if (c.roundRect) c.roundRect(-w / 2, -h / 2, w, h, h / 2);
    else c.rect(-w / 2, -h / 2, w, h);
    c.fill();
  } else {
    const r = p.r * 1.3;
    const q = r * 0.28;
    c.beginPath();
    c.moveTo(0, -r);
    c.quadraticCurveTo(q, -q, r, 0);
    c.quadraticCurveTo(q, q, 0, r);
    c.quadraticCurveTo(-q, q, -r, 0);
    c.quadraticCurveTo(-q, -q, 0, -r);
    c.fill();
  }
}

function tick(t: number) {
  if (!ctx) return;
  const dt = Math.min(32, t - last) / 16.67;
  last = t;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const p of parts) p.life += dt * 16.67;
  parts = parts.filter(p => p.life < p.max);
  for (const p of parts) {
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const k = p.life / p.max;
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    draw(ctx, p);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (parts.length) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

export function playBurst(effect: BurstEffect) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const p = origin();
  burst(p.x, p.y, burstPresets[effect]);
}
