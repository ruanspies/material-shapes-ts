/**
 * Optional Vue plugin that registers everything globally:
 *   - the `v-material-shape` directive
 *   - the `<ShapeSurface>` and `<ShapeBackdrop>` components
 *
 *   import { MaterialShapesPlugin } from 'material-shapes-ts/vue';
 *   app.use(MaterialShapesPlugin);
 *
 * You can skip this and import the directive/components locally instead.
 */
import type { App } from 'vue';
import { vMaterialShape } from './directive.js';
import { ShapeSurface, ShapeBackdrop } from './components.js';

export const MaterialShapesPlugin = {
    install(app: App): void {
        app.directive('material-shape', vMaterialShape);
        app.component('ShapeSurface', ShapeSurface);
        app.component('ShapeBackdrop', ShapeBackdrop);
    },
};
