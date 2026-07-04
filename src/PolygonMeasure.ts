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

import { Cubic } from './Cubic.js';
import { RoundedPolygon } from './RoundedPolygon.js';
import { Feature, Corner } from './Features.js';
import { ProgressableFeature } from './FeatureMapping.js';
import { debugLog, DistanceEpsilon, positiveModulo } from './Utils.js';
import { Point } from './Point.js';

const LOG_TAG = "PolygonMeasure";
const DEBUG = false;

export class MeasuredPolygon extends Array<MeasuredPolygon.MeasuredCubic> {
    private constructor(
        private measurer: Measurer,
        public features: ProgressableFeature[],
        cubics: Cubic[],
        outlineProgress: number[]
    ) {
        super();
        if (outlineProgress.length !== cubics.length + 1) {
            throw new Error("Outline progress size is expected to be the cubics size + 1");
        }
        if (outlineProgress[0] !== 0) {
            throw new Error("First outline progress value is expected to be zero");
        }
        if (outlineProgress[outlineProgress.length - 1] !== 1) {
            throw new Error("Last outline progress value is expected to be one");
        }

        if (DEBUG) {
            debugLog(LOG_TAG, () =>
                `CTOR: cubics = ${cubics.join()}\nCTOR: op = ${outlineProgress.join()}`
            );
        }

        let startOutlineProgress = 0;
        for (let i = 0; i < cubics.length; i++) {
            if (outlineProgress[i + 1] - outlineProgress[i] > DistanceEpsilon) {
                this.push(
                    new MeasuredPolygon.MeasuredCubic(
                        this.measurer,
                        cubics[i],
                        startOutlineProgress,
                        outlineProgress[i + 1]
                    )
                );
                startOutlineProgress = outlineProgress[i + 1];
            }
        }
        this[this.length - 1].updateProgressRange(undefined, 1);
    }

    cutAndShift(cuttingPoint: number): MeasuredPolygon {
        if (cuttingPoint < 0 || cuttingPoint > 1) {
            throw new Error("Cutting point is expected to be between 0 and 1");
        }
        if (cuttingPoint < DistanceEpsilon) return this;

        const targetIndex = this.findIndex(
            it => cuttingPoint >= it.startOutlineProgress && cuttingPoint <= it.endOutlineProgress
        );
        const target = this[targetIndex];

        if (DEBUG) {
            this.forEach((cubic, index) =>
                debugLog(LOG_TAG, () => `cut&Shift | cubic #${index} : ${cubic} `)
            );
            debugLog(LOG_TAG, () =>
                `cut&Shift, cuttingPoint = ${cuttingPoint}, target = (${targetIndex}) ${target}`
            );
        }

        const [b1, b2] = target.cutAtProgress(cuttingPoint);
        debugLog(LOG_TAG, () => `Split | ${target} -> ${b1} & ${b2}`);

        const retCubics = [b2.cubic];
        for (let i = 1; i < this.length; i++) {
            retCubics.push(this[(i + targetIndex) % this.length].cubic);
        }
        retCubics.push(b1.cubic);

        const retOutlineProgress = [0];
        for (let i = 0; i < this.length; i++) {
            const cubicIndex = (targetIndex + i) % this.length;
            retOutlineProgress.push(
                positiveModulo(this[cubicIndex].endOutlineProgress - cuttingPoint, 1)
            );
        }
        retOutlineProgress.push(1);

        const newFeatures = this.features.map(f => ({
            progress: positiveModulo(f.progress - cuttingPoint, 1),
            feature: f.feature,
        }));

        return new MeasuredPolygon(this.measurer, newFeatures, retCubics, retOutlineProgress);
    }

    static measurePolygon(measurer: Measurer, polygon: RoundedPolygon): MeasuredPolygon {
        const cubics: Cubic[] = [];
        const featureToCubic: [Feature, number][] = [];

        for (const feature of polygon.features) {
            for (let i = 0; i < feature.cubics.length; i++) {
                if (feature instanceof Corner && i === Math.floor(feature.cubics.length / 2)) {
                    featureToCubic.push([feature, cubics.length]);
                }
                cubics.push(feature.cubics[i]);
            }
        }

        const measures = cubics.reduce(
            (acc, cubic) => {
                const measure = measurer.measureCubic(cubic);
                if (measure < 0) {
                    throw new Error("Measured cubic is expected to be greater or equal to zero");
                }
                acc.push(acc[acc.length - 1] + measure);
                return acc;
            },
            [0]
        );
        const totalMeasure = measures[measures.length - 1];
        const outlineProgress = measures.map(m => m / totalMeasure);

        debugLog(LOG_TAG, () => `Total size: ${totalMeasure}`);

        const features = featureToCubic.map(([feature, ix]) => ({
            progress: positiveModulo((outlineProgress[ix] + outlineProgress[ix + 1]) / 2, 1),
            feature,
        }));

        return new MeasuredPolygon(measurer, features, cubics, outlineProgress);
    }
}

export namespace MeasuredPolygon {
    export class MeasuredCubic {
        measuredSize: number;

        constructor(
            private measurer: Measurer,
            public cubic: Cubic,
            public startOutlineProgress: number,
            public endOutlineProgress: number
        ) {
            if (endOutlineProgress < startOutlineProgress) {
                throw new Error("endOutlineProgress is expected to be equal or greater than startOutlineProgress");
            }
            this.measuredSize = measurer.measureCubic(cubic);
        }

        updateProgressRange(
            startOutlineProgress: number = this.startOutlineProgress,
            endOutlineProgress: number = this.endOutlineProgress
        ) {
            if (endOutlineProgress < startOutlineProgress) {
                throw new Error("endOutlineProgress is expected to be equal or greater than startOutlineProgress");
            }
            this.startOutlineProgress = startOutlineProgress;
            this.endOutlineProgress = endOutlineProgress;
        }

        cutAtProgress(cutOutlineProgress: number): [MeasuredCubic, MeasuredCubic] {
            const boundedCutOutlineProgress = Math.max(
                this.startOutlineProgress,
                Math.min(cutOutlineProgress, this.endOutlineProgress)
            );
            const outlineProgressSize = this.endOutlineProgress - this.startOutlineProgress;
            const progressFromStart = boundedCutOutlineProgress - this.startOutlineProgress;
            const relativeProgress = progressFromStart / outlineProgressSize;
            const t = this.measurer.findCubicCutPoint(
                this.cubic,
                relativeProgress * this.measuredSize
            );
            if (t < 0 || t > 1) {
                throw new Error("Cubic cut point is expected to be between 0 and 1");
            }

            debugLog(LOG_TAG, () =>
                `cutAtProgress: progress = ${boundedCutOutlineProgress} / ` +
                `this = [${this.startOutlineProgress} .. ${this.endOutlineProgress}] / ` +
                `ps = ${progressFromStart} / rp = ${relativeProgress} / t = ${t}`
            );

            const [c1, c2] = this.cubic.split(t);
            return [
                new MeasuredCubic(
                    this.measurer, c1, this.startOutlineProgress, boundedCutOutlineProgress
                ),
                new MeasuredCubic(
                    this.measurer, c2, boundedCutOutlineProgress, this.endOutlineProgress
                ),
            ];
        }

        toString(): string {
            return `MeasuredCubic(outlineProgress=[${this.startOutlineProgress} .. ${this.endOutlineProgress}], size=${this.measuredSize}, cubic=${this.cubic})`;
        }
    }
}


export interface Measurer {
    measureCubic(c: Cubic): number;
    findCubicCutPoint(c: Cubic, m: number): number;
}

export class LengthMeasurer implements Measurer {
    // Kotlin fixes this at 3 — "the minimum number needed to achieve up to 98.5%
    // accuracy" for arc-length measurement. Using a different count shifts every
    // outline-progress value and diverges the morph match from the reference.
    private readonly segments = 3;

    measureCubic(c: Cubic): number {
        return this.closestProgressTo(c, Infinity)[1];
    }

    findCubicCutPoint(c: Cubic, m: number): number {
        return this.closestProgressTo(c, m)[0];
    }

    private closestProgressTo(cubic: Cubic, threshold: number): [number, number] {
        let total = 0;
        let remainder = threshold;
        let prev = new Point(cubic.anchor0X, cubic.anchor0Y);

        for (let i = 1; i <= this.segments; i++) {
            const progress = i / this.segments;
            const point = cubic.pointOnCurve(progress);
            const segment = point.minus(prev).getDistance();

            if (segment >= remainder) {
                return [progress - (1 - remainder / segment) / this.segments, threshold];
            }

            remainder -= segment;
            total += segment;
            prev = point;
        }

        return [1, total];
    }
}
