/**
 * `v-material-shape` — clips any element to one of the 35 Material shapes, with
 * optional hover/focus morphing between two shapes.
 *
 * Works on any element or component root because it uses an SVG clipPath with
 * `clipPathUnits="objectBoundingBox"`: the shapes are normalized to a 0..1 box,
 * which maps 1:1 onto the element's bounding box, so one path clips at any size.
 *
 *   <button v-material-shape="'Flower'">…</button>                     // static
 *   <div v-material-shape="{ shape: 'Sunny' }" />                       // static (explicit)
 *   <button v-material-shape="{ rest: 'Circle', hover: 'Flower' }">…</button>
 *
 * NOTE: clip-path clips box-shadow/elevation, CSS borders and the focus ring.
 * For interactive elements prefer <ShapeSurface>, which restores a focus ring.
 */
import type { Directive } from 'vue';
import { Morph } from '../Morph.js';
import { morphToPath } from '../MaterialShapes.js';
import type { Easing, EasingName } from '../Easing.js';
import { resolveShape, type ShapeSource } from './shared.js';
import { createClip, nextClipId, removeClip, shapePath, tween } from './internal.js';

export type ShapeTrigger = 'hover' | 'focus' | 'both';

/** Morph-on-interaction configuration. */
export interface ShapeMorphConfig {
    /** Silhouette at rest. */
    rest: ShapeSource;
    /** Silhouette while hovered/focused. */
    hover: ShapeSource;
    /** Morph duration in ms. Default 300. */
    duration?: number;
    /** Easing function or Material token. Default 'emphasized'. */
    easing?: Easing | EasingName;
    /** What drives the morph. Default 'both'. */
    trigger?: ShapeTrigger;
}

/** Accepted values for `v-material-shape`. */
export type MaterialShapeValue = ShapeSource | { shape: ShapeSource } | ShapeMorphConfig;

type Normalized =
    | { kind: 'static'; shape: ShapeSource }
    | {
          kind: 'morph';
          rest: ShapeSource;
          hover: ShapeSource;
          duration: number;
          easing: Easing | EasingName;
          trigger: ShapeTrigger;
      };

interface Instance {
    clipId: string;
    pathEl: SVGPathElement;
    key: string;
    morph?: Morph;
    progress: number;
    duration: number;
    easing: Easing | EasingName;
    cancelTween?: () => void;
    removeListeners?: () => void;
}

const store = new WeakMap<HTMLElement, Instance>();

function isMorphConfig(v: unknown): v is ShapeMorphConfig {
    return typeof v === 'object' && v !== null && 'rest' in v && 'hover' in v;
}

function normalize(value: MaterialShapeValue): Normalized {
    if (typeof value === 'string') return { kind: 'static', shape: value };
    if (isMorphConfig(value)) {
        return {
            kind: 'morph',
            rest: value.rest,
            hover: value.hover,
            duration: value.duration ?? 300,
            easing: value.easing ?? 'emphasized',
            trigger: value.trigger ?? 'both',
        };
    }
    if (typeof value === 'object' && value !== null && 'shape' in value) {
        return { kind: 'static', shape: (value as { shape: ShapeSource }).shape };
    }
    // A raw RoundedPolygon.
    return { kind: 'static', shape: value as ShapeSource };
}

const nameOf = (s: ShapeSource): string => (typeof s === 'string' ? s : 'polygon');

/** A stable string used to detect when the bound value meaningfully changed. */
function keyOf(value: MaterialShapeValue): string {
    const n = normalize(value);
    if (n.kind === 'static') return `static:${nameOf(n.shape)}`;
    const easing = typeof n.easing === 'string' ? n.easing : 'fn';
    return `morph:${nameOf(n.rest)}~${nameOf(n.hover)}~${n.duration}~${easing}~${n.trigger}`;
}

function setClip(el: HTMLElement, id: string): void {
    el.style.clipPath = `url(#${id})`;
    el.style.setProperty('-webkit-clip-path', `url(#${id})`);
}

function animateTo(inst: Instance, target: 0 | 1): void {
    inst.cancelTween?.();
    inst.cancelTween = tween({
        from: inst.progress,
        to: target,
        duration: inst.duration,
        easing: inst.easing,
        onUpdate: (p) => {
            inst.progress = p;
            inst.pathEl.setAttribute('d', morphToPath(inst.morph!, p).toSvgPathData());
        },
    });
}

function attachMorph(el: HTMLElement, inst: Instance, trigger: ShapeTrigger): void {
    const enter = (): void => animateTo(inst, 1);
    const leave = (): void => animateTo(inst, 0);
    const bound: Array<[string, EventListener]> = [];
    if (trigger === 'hover' || trigger === 'both') bound.push(['mouseenter', enter], ['mouseleave', leave]);
    // focusin/focusout bubble, so focusing inner content (e.g. a button label) counts too.
    if (trigger === 'focus' || trigger === 'both') bound.push(['focusin', enter], ['focusout', leave]);
    bound.forEach(([type, handler]) => el.addEventListener(type, handler));
    inst.removeListeners = () => bound.forEach(([type, handler]) => el.removeEventListener(type, handler));
}

function init(el: HTMLElement, value: MaterialShapeValue): void {
    const n = normalize(value);
    const clipId = nextClipId();
    let morph: Morph | undefined;
    let initialD: string;

    if (n.kind === 'static') {
        initialD = shapePath(n.shape);
    } else {
        morph = new Morph(resolveShape(n.rest), resolveShape(n.hover));
        initialD = morphToPath(morph, 0).toSvgPathData();
    }

    const pathEl = createClip(clipId, initialD);
    setClip(el, clipId);

    const inst: Instance = {
        clipId,
        pathEl,
        key: keyOf(value),
        morph,
        progress: 0,
        duration: n.kind === 'morph' ? n.duration : 0,
        easing: n.kind === 'morph' ? n.easing : 'emphasized',
    };
    store.set(el, inst);

    if (n.kind === 'morph') attachMorph(el, inst, n.trigger);
}

function teardown(el: HTMLElement): void {
    const inst = store.get(el);
    if (!inst) return;
    inst.cancelTween?.();
    inst.removeListeners?.();
    removeClip(inst.clipId);
    el.style.removeProperty('clip-path');
    el.style.removeProperty('-webkit-clip-path');
    store.delete(el);
}

function warn(error: unknown): void {
    console.warn('[v-material-shape] could not apply shape:', error);
}

export const vMaterialShape: Directive<HTMLElement, MaterialShapeValue> = {
    mounted(el, binding) {
        try {
            init(el, binding.value);
        } catch (error) {
            warn(error);
        }
    },
    updated(el, binding) {
        const inst = store.get(el);
        if (inst && inst.key === keyOf(binding.value)) return;
        try {
            if (inst) teardown(el);
            init(el, binding.value);
        } catch (error) {
            warn(error);
        }
    },
    unmounted(el) {
        teardown(el);
    },
};
