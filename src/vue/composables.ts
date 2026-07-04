import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { Morph } from '../Morph.js';
import { morphToPath, roundedPolygonToPath } from '../MaterialShapes.js';
import { ShapeSource, resolveShape } from './shared.js';

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
