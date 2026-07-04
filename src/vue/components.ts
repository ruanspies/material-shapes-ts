import { defineComponent, computed, h, type PropType } from 'vue';
import { roundedPolygonToPath, morphToPath } from '../MaterialShapes.js';
import { Morph } from '../Morph.js';
import { ShapeSource, resolveShape } from './shared.js';

/**
 * Renders a Material shape as an inline SVG.
 *
 * @example
 * <MaterialShape name="Heart" :size="120" color="deeppink" />
 * <MaterialShape :shape="myPolygon" />
 */
export const MaterialShape = defineComponent({
    name: 'MaterialShape',
    props: {
        /** A shape name (e.g. 'Heart') or a RoundedPolygon. */
        shape: { type: [String, Object] as PropType<ShapeSource>, required: true },
        /** Width & height in px (or any CSS length). Default 100. */
        size: { type: [Number, String], default: 100 },
        /** Fill color. Default 'currentColor'. */
        color: { type: String, default: 'currentColor' },
    },
    setup(props, { attrs }) {
        const d = computed(() => roundedPolygonToPath(resolveShape(props.shape)).toSvgPathData());
        return () =>
            h(
                'svg',
                {
                    width: props.size,
                    height: props.size,
                    viewBox: '0 0 1 1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    ...attrs,
                },
                [h('path', { d: d.value, fill: props.color })]
            );
    },
});

/**
 * Renders a morph between two shapes at a given progress, as inline SVG.
 * Bind `progress` (0..1) to a reactive value or animate it yourself.
 *
 * @example
 * <ShapeMorph from="Circle" to="Heart" :progress="t" :size="120" />
 */
export const ShapeMorph = defineComponent({
    name: 'ShapeMorph',
    props: {
        from: { type: [String, Object] as PropType<ShapeSource>, required: true },
        to: { type: [String, Object] as PropType<ShapeSource>, required: true },
        /** Morph progress, 0 = from, 1 = to. */
        progress: { type: Number, default: 0 },
        size: { type: [Number, String], default: 100 },
        color: { type: String, default: 'currentColor' },
    },
    setup(props, { attrs }) {
        const morph = computed(() => new Morph(resolveShape(props.from), resolveShape(props.to)));
        const d = computed(() => {
            const p = Math.max(0, Math.min(1, props.progress));
            return morphToPath(morph.value, p).toSvgPathData();
        });
        return () =>
            h(
                'svg',
                {
                    width: props.size,
                    height: props.size,
                    viewBox: '0 0 1 1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    ...attrs,
                },
                [h('path', { d: d.value, fill: props.color })]
            );
    },
});
