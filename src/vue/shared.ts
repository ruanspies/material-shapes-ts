import { MaterialShapes, MaterialShapeName } from '../MaterialShapes.js';
import { RoundedPolygon } from '../RoundedPolygon.js';

/** A shape source: either a live RoundedPolygon or the name of a Material shape. */
export type ShapeSource = RoundedPolygon | MaterialShapeName;

/** Resolves a ShapeSource (name or polygon) to a RoundedPolygon. */
export function resolveShape(source: ShapeSource): RoundedPolygon {
    return typeof source === 'string' ? MaterialShapes.byName(source) : source;
}
