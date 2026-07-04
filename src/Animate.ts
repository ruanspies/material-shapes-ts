/*
 * A tiny, dependency-free animator for morphing between two shapes.
 *
 * It builds a Morph once (feature matching is the expensive part) and samples
 * it every animation frame, handing you an SVG path string you can drop onto a
 * <path d="..."> or a CSS `clip-path: path(...)`.
 */

import { Morph } from './Morph.js';
import { RoundedPolygon } from './RoundedPolygon.js';
import { morphToPath } from './MaterialShapes.js';
import { Easing, EasingName, resolveEasing } from './Easing.js';

export interface MorphAnimationOptions {
    /** Duration in milliseconds. Default 400. */
    duration?: number;
    /** Easing function or Material token name. Default 'emphasized'. */
    easing?: Easing | EasingName;
    /** Called each frame with the current SVG path data and eased progress [0,1]. */
    onFrame: (pathData: string, progress: number) => void;
    /** Called once when the animation reaches the end (not called if cancelled). */
    onComplete?: () => void;
    /** Play from end back to start. Default false. */
    reverse?: boolean;
}

export interface MorphAnimation {
    /** Stops the animation immediately. Leaves the last rendered frame in place. */
    cancel(): void;
    /** Resolves when the animation completes; rejects never (cancel resolves too). */
    finished: Promise<void>;
}

const now: () => number =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? () => performance.now()
        : () => Date.now();

const raf: (cb: (t: number) => void) => number =
    typeof requestAnimationFrame === 'function'
        ? (cb) => requestAnimationFrame(cb)
        : (cb) => setTimeout(() => cb(now()), 16) as unknown as number;

const cancelRaf: (h: number) => void =
    typeof cancelAnimationFrame === 'function'
        ? (h) => cancelAnimationFrame(h)
        : (h) => clearTimeout(h);

/**
 * Animates a morph between two shapes (or two ends of a prebuilt Morph),
 * calling `onFrame` with an SVG path string each frame.
 *
 * @example
 * animateMorph(MaterialShapes.Circle, MaterialShapes.Heart, {
 *   duration: 400,
 *   easing: 'emphasized',
 *   onFrame: (d) => pathEl.setAttribute('d', d),
 * });
 */
export function animateMorph(
    from: RoundedPolygon | Morph,
    to: RoundedPolygon | MorphAnimationOptions,
    options?: MorphAnimationOptions
): MorphAnimation {
    let morph: Morph;
    let opts: MorphAnimationOptions;

    if (from instanceof Morph) {
        morph = from;
        opts = to as MorphAnimationOptions;
    } else {
        morph = new Morph(from, to as RoundedPolygon);
        opts = options as MorphAnimationOptions;
    }

    const duration = opts.duration ?? 400;
    const easing = resolveEasing(opts.easing);
    const reverse = opts.reverse ?? false;

    let handle = 0;
    let cancelled = false;
    let resolveFinished: () => void;
    const finished = new Promise<void>((res) => (resolveFinished = res));

    const render = (progress: number) => {
        const p = reverse ? 1 - progress : progress;
        opts.onFrame(morphToPath(morph, easing(p)).toSvgPathData(), easing(p));
    };

    if (duration <= 0) {
        render(1);
        opts.onComplete?.();
        resolveFinished!();
        return { cancel() {}, finished };
    }

    const start = now();
    const tick = (t: number) => {
        if (cancelled) return;
        const elapsed = t - start;
        const progress = Math.min(1, elapsed / duration);
        render(progress);
        if (progress < 1) {
            handle = raf(tick);
        } else {
            opts.onComplete?.();
            resolveFinished();
        }
    };
    handle = raf(tick);

    return {
        cancel() {
            if (cancelled) return;
            cancelled = true;
            cancelRaf(handle);
            resolveFinished();
        },
        finished,
    };
}
