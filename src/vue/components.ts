import { defineComponent, computed, h, ref, type PropType } from 'vue';
import { roundedPolygonToPath, morphToPath } from '../MaterialShapes.js';
import { Morph } from '../Morph.js';
import type { EasingName } from '../Easing.js';
import { ShapeSource, resolveShape } from './shared.js';
import { useShapePath, useMorph } from './composables.js';
import { nextClipId, tween } from './internal.js';

/**
 * Renders a Material shape as an inline SVG.
 *
 * @example
 * <MaterialShape :shape="'Heart'" :size="120" color="deeppink" />
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

/**
 * Clips its default slot to a Material shape, with optional hover/focus morphing.
 * Use for new shaped surfaces (tiles, FABs, avatars, badges).
 *
 * Unlike the `v-material-shape` directive, this owns a wrapper, so it can host an
 * unclipped focus ring (the clip would otherwise cut it off). Style the ring with
 * `--shape-focus-color` and add elevation with `--shape-surface-shadow`
 * (a drop-shadow filter — a normal box-shadow would be clipped away).
 *
 * @example
 * <ShapeSurface shape="Circle" hover-shape="Flower" :size="72"><Icon /></ShapeSurface>
 */
export const ShapeSurface = defineComponent({
    name: 'ShapeSurface',
    props: {
        /** Shape at rest (or the only shape, if `hoverShape` is unset). */
        shape: { type: [String, Object] as PropType<ShapeSource>, required: true },
        /** If set, the surface morphs to this shape on hover/focus. */
        hoverShape: { type: [String, Object] as PropType<ShapeSource>, default: undefined },
        /** Width & height. A number is treated as px. Default 96. */
        size: { type: [Number, String], default: 96 },
        /** Morph duration in ms. Default 300. */
        duration: { type: Number, default: 300 },
        /** Easing token for the morph. Default 'emphasized'. */
        easing: { type: String as PropType<EasingName>, default: 'emphasized' },
        /** What drives the morph. Default 'both'. */
        trigger: { type: String as PropType<'hover' | 'focus' | 'both'>, default: 'both' },
        /** Root element tag. Default 'div'. */
        tag: { type: String, default: 'div' },
    },
    setup(props, { slots }) {
        const clipId = nextClipId('ms-surface');
        const progress = ref(0);
        const focused = ref(false);

        // Both hooks are declared unconditionally; the morph's Morph is only built
        // lazily when `pathD` actually reads it (i.e. when hoverShape is set).
        const staticPath = useShapePath(() => props.shape);
        const morphPath = useMorph(
            () => props.shape,
            () => props.hoverShape ?? props.shape,
            progress
        );
        const pathD = computed(() => (props.hoverShape ? morphPath.value : staticPath.value));

        const sizeCss = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
        const hoverOn = computed(() => props.trigger === 'hover' || props.trigger === 'both');
        const focusOn = computed(() => props.trigger === 'focus' || props.trigger === 'both');

        let cancel: (() => void) | undefined;
        const to = (target: 0 | 1): void => {
            if (!props.hoverShape) return;
            cancel?.();
            cancel = tween({
                from: progress.value,
                to: target,
                duration: props.duration,
                easing: props.easing,
                onUpdate: (p) => {
                    progress.value = p;
                },
            });
        };

        const onMouseEnter = (): void => {
            if (hoverOn.value) to(1);
        };
        const onMouseLeave = (): void => {
            if (hoverOn.value) to(0);
        };
        const onFocusIn = (): void => {
            focused.value = true;
            if (focusOn.value) to(1);
        };
        const onFocusOut = (): void => {
            focused.value = false;
            if (focusOn.value) to(0);
        };

        return () =>
            h(
                props.tag,
                {
                    style: {
                        position: 'relative',
                        display: 'inline-flex',
                        width: sizeCss.value,
                        height: sizeCss.value,
                        // Elevation must be a filter, not box-shadow (box-shadow is clipped away).
                        filter: 'var(--shape-surface-shadow, none)',
                        // The clip cuts off any inner focus ring, so surface a visible one here.
                        outline: focused.value ? '2px solid var(--shape-focus-color, #3b82f6)' : 'none',
                        outlineOffset: '3px',
                        borderRadius: '6px',
                    },
                    onMouseenter: onMouseEnter,
                    onMouseleave: onMouseLeave,
                    onFocusin: onFocusIn,
                    onFocusout: onFocusOut,
                },
                [
                    h(
                        'svg',
                        {
                            width: 0,
                            height: 0,
                            'aria-hidden': 'true',
                            style: { position: 'absolute', width: 0, height: 0, overflow: 'hidden' },
                        },
                        [
                            h('clipPath', { id: clipId, clipPathUnits: 'objectBoundingBox' }, [
                                h('path', { d: pathD.value }),
                            ]),
                        ]
                    ),
                    h(
                        'div',
                        {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                                clipPath: `url(#${clipId})`,
                                WebkitClipPath: `url(#${clipId})`,
                            },
                        },
                        slots.default ? slots.default() : []
                    ),
                ]
            );
    },
});

/**
 * Renders a filled Material shape behind its slotted content — the
 * decorative-backdrop pattern (a shape sitting under text/components).
 *
 * @example
 * <ShapeBackdrop shape="Sunny" color="teal" :opacity="0.12"><h2>On top</h2></ShapeBackdrop>
 */
export const ShapeBackdrop = defineComponent({
    name: 'ShapeBackdrop',
    props: {
        /** Which shape to draw. */
        shape: { type: [String, Object] as PropType<ShapeSource>, required: true },
        /** Fill color (any CSS color; defaults to the inherited text color). */
        color: { type: String, default: 'currentColor' },
        /** Fill opacity 0..1. Default 1. */
        opacity: { type: Number, default: 1 },
        /** 'fill' stretches the shape to the box; 'contain' keeps its aspect. Default 'fill'. */
        fit: { type: String as PropType<'fill' | 'contain'>, default: 'fill' },
    },
    setup(props, { slots }) {
        const pathD = useShapePath(() => props.shape);
        const par = computed(() => (props.fit === 'contain' ? 'xMidYMid meet' : 'none'));
        return () =>
            h('div', { style: { position: 'relative' } }, [
                h(
                    'svg',
                    {
                        viewBox: '0 0 1 1',
                        preserveAspectRatio: par.value,
                        'aria-hidden': 'true',
                        style: {
                            position: 'absolute',
                            inset: '0',
                            width: '100%',
                            height: '100%',
                            zIndex: 0,
                            pointerEvents: 'none',
                        },
                    },
                    [h('path', { d: pathD.value, fill: props.color, 'fill-opacity': props.opacity })]
                ),
                h('div', { style: { position: 'relative', zIndex: 1 } }, slots.default ? slots.default() : []),
            ]);
    },
});
