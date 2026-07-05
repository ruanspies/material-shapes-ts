/**
 * Internal helpers for the Vue clip/morph bindings. Not part of the public API —
 * import from `material-shapes-ts/vue` instead.
 */
import { resolveEasing, type Easing, type EasingName } from '../Easing.js';
import { roundedPolygonToPath } from '../MaterialShapes.js';
import { resolveShape, type ShapeSource } from './shared.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** SVG path data (normalized 0..1 box) for a shape — drops straight into a clipPath. */
export function shapePath(shape: ShapeSource): string {
    return roundedPolygonToPath(resolveShape(shape)).toSvgPathData();
}

let idCounter = 0;
/** A process-unique, DOM-safe id for a clipPath. */
export function nextClipId(prefix = 'ms-clip'): string {
    return `${prefix}-${(idCounter++).toString(36)}`;
}

/** True when the user asked the OS to minimize non-essential motion. */
export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
}

/* ------------------------------------------------------------------ *
 * Shared <clipPath> registry (imperative — used by the directive).
 * A single hidden <svg> in <body> holds every directive-created clipPath.
 * The components clip declaratively in their own render tree and don't use this.
 * ------------------------------------------------------------------ */

let defs: SVGSVGElement | null = null;

function ensureDefs(): SVGSVGElement {
    if (defs && defs.isConnected) return defs;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.appendChild(svg);
    defs = svg;
    return svg;
}

/** Creates a `clipPathUnits="objectBoundingBox"` clipPath and returns its <path>. */
export function createClip(id: string, d: string): SVGPathElement {
    const svg = ensureDefs();
    const clip = document.createElementNS(SVG_NS, 'clipPath');
    clip.setAttribute('id', id);
    clip.setAttribute('clipPathUnits', 'objectBoundingBox');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    clip.appendChild(path);
    svg.appendChild(clip);
    return path;
}

/** Removes a clipPath previously created with {@link createClip}. */
export function removeClip(id: string): void {
    defs?.querySelector(`#${CSS.escape(id)}`)?.remove();
}

/* ------------------------------------------------------------------ *
 * Motion — an interruptible rAF tween over a scalar (morph progress).
 * ------------------------------------------------------------------ */

export interface TweenOptions {
    from: number;
    to: number;
    duration: number;
    easing?: Easing | EasingName;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
}

/**
 * Tweens a scalar from `from` to `to` over `duration` ms with the given easing.
 * Snaps instantly when duration <= 0 or the user prefers reduced motion.
 * Returns a cancel function; cancelling leaves the last value in place.
 */
export function tween(options: TweenOptions): () => void {
    const { from, to, duration, easing, onUpdate, onComplete } = options;
    const ease = resolveEasing(easing);

    if (duration <= 0 || prefersReducedMotion()) {
        onUpdate(to);
        onComplete?.();
        return () => {};
    }

    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const span = to - from;

    const step = (now: number): void => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / duration);
        onUpdate(from + span * ease(t));
        if (t < 1) raf = requestAnimationFrame(step);
        else onComplete?.();
    };

    raf = requestAnimationFrame(step);
    return () => {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
    };
}
