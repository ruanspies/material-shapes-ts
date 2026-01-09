/*
 * Copyright 2022 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may an obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Cubic, MutableCubic } from './Cubic.js';
import { RoundedPolygon } from './RoundedPolygon.js';
import { featureMapper, MeasuredFeatures } from './FeatureMapping.js';
import { AngleEpsilon, debugLog, interpolate, positiveModulo, DEBUG } from './Utils.js';
import { Point } from './Point.js';
import { toStringWithLessPrecision } from './String.js';
import { MeasuredPolygon, LengthMeasurer } from './PolygonMeasure.js';

const LOG_TAG = "Morph";

export class Morph {
    private readonly morphMatch: [Cubic, Cubic][];

    constructor(private start: RoundedPolygon, private end: RoundedPolygon) {
        this.morphMatch = Morph.match(start, end);
    }

    calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate: boolean = true): number[] {
        this.start.calculateBounds(bounds, approximate);
        const [minX, minY, maxX, maxY] = bounds;
        this.end.calculateBounds(bounds, approximate);
        bounds[0] = Math.min(minX, bounds[0]);
        bounds[1] = Math.min(minY, bounds[1]);
        bounds[2] = Math.max(maxX, bounds[2]);
        bounds[3] = Math.max(maxY, bounds[3]);
        return bounds;
    }

    calculateMaxBounds(bounds: number[] = [0, 0, 0, 0]): number[] {
        this.start.calculateMaxBounds(bounds);
        const [minX, minY, maxX, maxY] = bounds;
        this.end.calculateMaxBounds(bounds);
        bounds[0] = Math.min(minX, bounds[0]);
        bounds[1] = Math.min(minY, bounds[1]);
        bounds[2] = Math.max(maxX, bounds[2]);
        bounds[3] = Math.max(maxY, bounds[3]);
        return bounds;
    }

    asCubics(progress: number): Cubic[] {
        const cubics: Cubic[] = [];
        let firstCubic: Cubic | null = null;
        let lastCubic: Cubic | null = null;
        for (const [startCubic, endCubic] of this.morphMatch) {
            const points = startCubic.points.map((startPoint, i) =>
                interpolate(startPoint, endCubic.points[i], progress)
            );
            const cubic = new Cubic(points);
            if (!firstCubic) firstCubic = cubic;
            if (lastCubic) cubics.push(lastCubic);
            lastCubic = cubic;
        }
        if (lastCubic && firstCubic) {
            cubics.push(new Cubic([
                lastCubic.anchor0X, lastCubic.anchor0Y,
                lastCubic.control0X, lastCubic.control0Y,
                lastCubic.control1X, lastCubic.control1Y,
                firstCubic.anchor0X, firstCubic.anchor0Y,
            ]));
        }
        return cubics;
    }

    forEachCubic(
        progress: number,
        mutableCubic: MutableCubic = new MutableCubic(),
        callback: (mutableCubic: MutableCubic) => void
    ) {
        for (const [startCubic, endCubic] of this.morphMatch) {
            mutableCubic.interpolate(startCubic, endCubic, progress);
            callback(mutableCubic);
        }
    }

    private static match(p1: RoundedPolygon, p2: RoundedPolygon): [Cubic, Cubic][] {
        const measuredPolygon1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1);
        const measuredPolygon2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2);
        const features1 = measuredPolygon1.features;
        const features2 = measuredPolygon2.features;
        const doubleMapper = featureMapper(features1, features2);
        const polygon2CutPoint = doubleMapper.map(0);
        debugLog(LOG_TAG, () => `polygon2CutPoint = ${polygon2CutPoint}`);

        const bs1 = measuredPolygon1;
        const bs2 = measuredPolygon2.cutAndShift(polygon2CutPoint);

        if (DEBUG) {
            bs1.forEach((cubic, index) =>
                debugLog(LOG_TAG, () => `start ${index}: ${cubic}`)
            );
            bs2.forEach((cubic, index) =>
                debugLog(LOG_TAG, () => `End ${index}: ${cubic}`)
            );
        }

        const ret: [Cubic, Cubic][] = [];
        let i1 = 0, i2 = 0;
        let b1 = i1 < bs1.length ? bs1[i1++] : null;
        let b2 = i2 < bs2.length ? bs2[i2++] : null;

        while (b1 && b2) {
            const b1a = i1 === bs1.length ? 1 : b1.endOutlineProgress;
            const b2a =
                i2 === bs2.length
                    ? 1
                    : doubleMapper.mapBack(
                        positiveModulo(b2.endOutlineProgress + polygon2CutPoint, 1)
                    );
            const minb = Math.min(b1a, b2a);
            debugLog(LOG_TAG, () => `${b1a} ${b2a} | ${minb}`);

            let seg1: MeasuredPolygon.MeasuredCubic, newb1: MeasuredPolygon.MeasuredCubic | null;
            if (b1a > minb + AngleEpsilon) {
                debugLog(LOG_TAG, () => "Cut 1");
                [seg1, newb1] = b1.cutAtProgress(minb);
            } else {
                seg1 = b1;
                newb1 = i1 < bs1.length ? bs1[i1++] : null;
            }

            let seg2: MeasuredPolygon.MeasuredCubic, newb2: MeasuredPolygon.MeasuredCubic | null;
            if (b2a > minb + AngleEpsilon) {
                debugLog(LOG_TAG, () => "Cut 2");
                [seg2, newb2] = b2.cutAtProgress(
                    positiveModulo(doubleMapper.map(minb) - polygon2CutPoint, 1)
                );
            } else {
                seg2 = b2;
                newb2 = i2 < bs2.length ? bs2[i2++] : null;
            }

            debugLog(LOG_TAG, () => `Match: ${seg1} -> ${seg2}`);
            ret.push([seg1.cubic, seg2.cubic]);
            b1 = newb1;
            b2 = newb2;
        }

        if (b1 || b2) {
            throw new Error("Expected both Polygon's Cubic to be fully matched");
        }

        if (DEBUG) {
            const showPoint = (p: Point) =>
                `${toStringWithLessPrecision(p.x * 100)} ${toStringWithLessPrecision(p.y * 100)}`;

            for (let listIx = 0; listIx < 2; listIx++) {
                const points = ret.map(pair => (listIx === 0 ? pair[0] : pair[1]));
                const first = points[0];
                const path =
                    `M ${showPoint(new Point(first.anchor0X, first.anchor0Y))} ` +
                    points
                        .map(
                            it =>
                                `C ${showPoint(new Point(it.control0X, it.control0Y))}, ` +
                                `${showPoint(new Point(it.control1X, it.control1Y))}, ` +
                                `${showPoint(new Point(it.anchor1X, it.anchor1Y))}`
                        )
                        .join(" ") +
                    " Z";
                debugLog(LOG_TAG, () => path);
            }
        }
        return ret;
    }
}
