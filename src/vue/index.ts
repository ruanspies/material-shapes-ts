/**
 * Vue 3 bindings for material-shapes-ts.
 *
 * Import from the `material-shapes-ts/vue` subpath:
 *   import { MaterialShape, ShapeMorph, useMorph, useShapePath } from 'material-shapes-ts/vue';
 *
 * `vue` is a peer dependency and is not bundled into the core package.
 */
export { MaterialShape, ShapeMorph } from './components.js';
export { useShapePath, useMorph } from './composables.js';
export { resolveShape, type ShapeSource } from './shared.js';
