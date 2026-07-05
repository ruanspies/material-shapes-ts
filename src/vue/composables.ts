import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { Morph } from '../Morph.js';
import { morphToPath, roundedPolygonToPath } from '../MaterialShapes.js';
import { ShapeSource, resolveShape } from './shared.js';
import { nextClipId } from './internal.js';

/**
 * Reactive SVG path data for a single Material shape.
 *
 * @example
 * const d = useShapePath('Heart');
 * // <path :d="d" />
 */
export function useShapePath(shape: MaybeRefOrGetter<ShapeSource>): ComputedRef<string> {
    return computed(() => roundedPolygonToPath(resolveShape(toValue(shape))).toSvgPathData());
}

/**
 * Reactive SVG path data for a morph between two shapes at a given progress.
 * The underlying Morph is memoized and only rebuilt when `from` or `to` change,
 * so scrubbing `progress` stays cheap.
 *
 * @example
 * const t = ref(0);
 * const d = useMorph('Circle', 'Heart', t);
 * // <path :d="d" />
 */
export function useMorph(
    from: MaybeRefOrGetter<ShapeSource>,
    to: MaybeRefOrGetter<ShapeSource>,
    progress: MaybeRefOrGetter<number>
): ComputedRef<string> {
    const morph = computed(() => new Morph(resolveShape(toValue(from)), resolveShape(toValue(to))));
    return computed(() => {
        const p = Math.max(0, Math.min(1, toValue(progress)));
        return morphToPath(morph.value, p).toSvgPathData();
    });
}

/** What {@link useShapeClip} / {@link useShapeMorphClip} return. */
export interface ShapeClip {
    /** Bind to the `<clipPath id>`. */
    clipId: string;
    /** Reactive SVG path data (normalized 0..1) for the `<path d>`. */
    pathD: ComputedRef<string>;
    /** Reactive `style` object referencing the clipPath (incl. -webkit- fallback). */
    clipStyle: ComputedRef<{ clipPath: string; WebkitClipPath: string }>;
}

function clipStyleFor(clipId: string): ComputedRef<{ clipPath: string; WebkitClipPath: string }> {
    return computed(() => ({ clipPath: `url(#${clipId})`, WebkitClipPath: `url(#${clipId})` }));
}

/**
 * Clips your own element to a single, static Material shape, declaratively.
 * Render the clipPath once, then spread `clipStyle` onto any element:
 *
 * @example
 * const { clipId, pathD, clipStyle } = useShapeClip('Flower');
 * // <svg width="0" height="0" style="position:absolute">
 * //   <clipPath :id="clipId" clipPathUnits="objectBoundingBox"><path :d="pathD" /></clipPath>
 * // </svg>
 * // <div :style="clipStyle"> …clipped… </div>
 */
export function useShapeClip(shape: MaybeRefOrGetter<ShapeSource>): ShapeClip {
    const clipId = nextClipId('ms-clip');
    return { clipId, pathD: useShapePath(shape), clipStyle: clipStyleFor(clipId) };
}

/**
 * Clips your own element to a live morph between two shapes at a given progress
 * (0 = from, 1 = to). Drive `progress` from a slider, scroll, or a tween.
 */
export function useShapeMorphClip(
    from: MaybeRefOrGetter<ShapeSource>,
    to: MaybeRefOrGetter<ShapeSource>,
    progress: MaybeRefOrGetter<number>
): ShapeClip {
    const clipId = nextClipId('ms-clip');
    return { clipId, pathD: useMorph(from, to, progress), clipStyle: clipStyleFor(clipId) };
}
