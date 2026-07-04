/*
 * Easing functions, including Material 3 motion easing tokens.
 *
 * An Easing is a function mapping a linear time fraction t in [0, 1] to an
 * eased fraction (usually also in [0, 1], though overshoot is allowed).
 */

export type Easing = (t: number) => number;

/**
 * Builds an easing function from a cubic Bézier curve with control points
 * (x1, y1) and (x2, y2), matching the CSS `cubic-bezier()` timing function.
 * The returned function maps input progress x in [0, 1] to output y.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
    // Precompute polynomial coefficients for the Bézier x(t) and y(t) curves,
    // where the endpoints are fixed at (0,0) and (1,1).
    const ax = 3 * x1 - 3 * x2 + 1;
    const bx = 3 * x2 - 6 * x1;
    const cx = 3 * x1;
    const ay = 3 * y1 - 3 * y2 + 1;
    const by = 3 * y2 - 6 * y1;
    const cy = 3 * y1;

    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const sampleDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

    // Solve x(t) = x for t using Newton-Raphson, falling back to bisection.
    const solveT = (x: number): number => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i++) {
            const xEst = sampleX(t) - x;
            if (Math.abs(xEst) < 1e-6) return t;
            const d = sampleDerivativeX(t);
            if (Math.abs(d) < 1e-6) break;
            t -= xEst / d;
        }
        // Bisection fallback.
        let lo = 0, hi = 1;
        t = x;
        while (lo < hi) {
            const xEst = sampleX(t);
            if (Math.abs(xEst - x) < 1e-6) break;
            if (x > xEst) lo = t; else hi = t;
            t = (lo + hi) / 2;
        }
        return t;
    };

    return (x: number) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        return sampleY(solveT(x));
    };
}

/** Linear (no) easing. */
export const linear: Easing = (t) => t;

/**
 * Material 3 motion easing tokens.
 * See https://m3.material.io/styles/motion/easing-and-duration
 */
export const Easings = {
    linear,
    standard: cubicBezier(0.2, 0.0, 0.0, 1.0),
    standardAccelerate: cubicBezier(0.3, 0.0, 1.0, 1.0),
    standardDecelerate: cubicBezier(0.0, 0.0, 0.0, 1.0),
    /** Emphasized — the expressive default for large, on-screen transitions. */
    emphasized: cubicBezier(0.2, 0.0, 0.0, 1.0),
    emphasizedAccelerate: cubicBezier(0.3, 0.0, 0.8, 0.15),
    emphasizedDecelerate: cubicBezier(0.05, 0.7, 0.1, 1.0),
} as const;

export type EasingName = keyof typeof Easings;

/** Resolves an Easing from either a function or a named Material token. */
export function resolveEasing(easing: Easing | EasingName | undefined): Easing {
    if (easing === undefined) return Easings.emphasized;
    if (typeof easing === 'function') return easing;
    return Easings[easing];
}
