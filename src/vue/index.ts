/**
 * Vue 3 bindings for material-shapes-ts.
 *
 * Import from the `material-shapes-ts/vue` subpath:
 *   import { MaterialShape, ShapeMorph, ShapeSurface, ShapeBackdrop,
 *            vMaterialShape, useMorph, useShapeClip, MaterialShapesPlugin }
 *     from 'material-shapes-ts/vue';
 *
 * `vue` is a peer dependency and is not bundled into the core package.
 */
export { MaterialShape, ShapeMorph, ShapeSurface, ShapeBackdrop } from './components.js';
export { useShapePath, useMorph, useShapeClip, useShapeMorphClip, type ShapeClip } from './composables.js';
export {
    vMaterialShape,
    type MaterialShapeValue,
    type ShapeMorphConfig,
    type ShapeTrigger,
} from './directive.js';
export { MaterialShapesPlugin } from './plugin.js';
export { resolveShape, type ShapeSource } from './shared.js';
