/*
 * Copyright 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Feature, Corner } from './Features.js';
import { Point } from './Point.js';
import { debugLog, DistanceEpsilon } from './Utils.js';
import {toStringWithLessPrecision} from './String.js';
import { DoubleMapper } from './DoubleMapper.js';

const LOG_TAG = "FeatureMapping";

export interface ProgressableFeature {
    progress: number;
    feature: Feature;
}

export type MeasuredFeatures = ProgressableFeature[];

export function featureMapper(features1: MeasuredFeatures, features2: MeasuredFeatures): DoubleMapper {
    const filteredFeatures1 = features1.filter(pf => pf.feature instanceof Corner);
    const filteredFeatures2 = features2.filter(pf => pf.feature instanceof Corner);
    const featureProgressMapping = doMapping(filteredFeatures1, filteredFeatures2);

    debugLog(LOG_TAG, () =>
        featureProgressMapping.map(([p1, p2]) => `${p1} -> ${p2}`).join(' ')
    );

    const dm = new DoubleMapper(featureProgressMapping);
    debugLog(LOG_TAG, () => {
        const N = 10;
        const map = Array.from({ length: N + 1 }, (_, i) =>
            toStringWithLessPrecision(dm.map(i / N))
        ).join(' ');
        const mapBack = Array.from({ length: N + 1 }, (_, i) =>
            toStringWithLessPrecision(dm.mapBack(i / N))
        ).join(' ');
        return `Map: ${map}\nMb : ${mapBack}`;
    });

    return dm;
}

interface DistanceVertex {
    distance: number;
    f1: ProgressableFeature;
    f2: ProgressableFeature;
}

function doMapping(
    features1: ProgressableFeature[],
    features2: ProgressableFeature[]
): [number, number][] {
    debugLog(LOG_TAG, () =>
        `Shape1 progresses: ${features1.map(f => f.progress).join(' ')}`
    );
    debugLog(LOG_TAG, () =>
        `Shape2 progresses: ${features2.map(f => f.progress).join(' ')}`
    );

    const distanceVertexList = features1
        .flatMap(f1 =>
            features2.map(f2 => {
                const d = featureDistSquared(f1.feature, f2.feature);
                return d !== Infinity ? { distance: d, f1, f2 } : null;
            })
        )
        .filter((v): v is DistanceVertex => v !== null)
        .sort((a, b) => a.distance - b.distance);

    if (distanceVertexList.length === 0) return [[0, 0], [0.5, 0.5]];
    if (distanceVertexList.length === 1) {
        const { f1, f2 } = distanceVertexList[0];
        return [
            [f1.progress, f2.progress],
            [(f1.progress + 0.5) % 1, (f2.progress + 0.5) % 1]
        ];
    }

    const helper = new MappingHelper();
    distanceVertexList.forEach(({ f1, f2 }) => helper.addMapping(f1, f2));
    return helper.mapping;
}

class MappingHelper {
    mapping: [number, number][] = [];
    private usedF1 = new Set<ProgressableFeature>();
    private usedF2 = new Set<ProgressableFeature>();

    addMapping(f1: ProgressableFeature, f2: ProgressableFeature) {
        if (this.usedF1.has(f1) || this.usedF2.has(f2)) return;

        const index = this.mapping.findIndex(([p, _]) => p > f1.progress);
        const insertionIndex = index === -1 ? this.mapping.length : index;

        const n = this.mapping.length;
        if (n >= 1) {
            const [before1, before2] = this.mapping[(insertionIndex + n - 1) % n];
            const [after1, after2] = this.mapping[insertionIndex % n];

            if (
                progressDistance(f1.progress, before1) < DistanceEpsilon ||
                progressDistance(f1.progress, after1) < DistanceEpsilon ||
                progressDistance(f2.progress, before2) < DistanceEpsilon ||
                progressDistance(f2.progress, after2) < DistanceEpsilon
            ) {
                return;
            }

            if (n > 1 && !progressInRange(f2.progress, before2, after2)) return;
        }

        this.mapping.splice(insertionIndex, 0, [f1.progress, f2.progress]);
        this.usedF1.add(f1);
        this.usedF2.add(f2);
    }
}

function progressDistance(a: number, b: number): number {
    const diff = Math.abs(a - b);
    return Math.min(diff, 1 - diff);
}

function progressInRange(p: number, start: number, end: number): boolean {
    if (start < end) return p >= start && p <= end;
    return p >= start || p <= end;
}


function featureDistSquared(f1: Feature, f2: Feature): number {
    if (
        f1 instanceof Corner &&
        f2 instanceof Corner &&
        f1.convex !== f2.convex
    ) {
        debugLog(LOG_TAG, () => "*** Feature distance ∞ for convex-vs-concave corners");
        return Infinity;
    }
    const p1 = featureRepresentativePoint(f1);
    const p2 = featureRepresentativePoint(f2);
    return p1.minus(p2).getDistanceSquared();
}

function featureRepresentativePoint(feature: Feature): Point {
    const firstCubic = feature.cubics[0];
    const lastCubic = feature.cubics[feature.cubics.length - 1];
    const x = (firstCubic.anchor0X + lastCubic.anchor1X) / 2;
    const y = (firstCubic.anchor0Y + lastCubic.anchor1Y) / 2;
    return new Point(x, y);
}
