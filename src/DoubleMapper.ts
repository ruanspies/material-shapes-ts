/*
 * Copyright 2024 The Android Open Source Project
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

import { linearMap, validateProgress } from './FloatMapping.js';

/**
 * A DoubleMapper maps a value in one coordinate space to another, and back,
 * given a set of (source, target) anchor pairs. The mapping is a CIRCULAR
 * piecewise-linear interpolation over [0, 1): the segment from the last anchor
 * back to the first wraps through 0/1. This is what lets Morph translate a
 * perimeter progress on one polygon to the corresponding progress on another.
 *
 * Faithful port of androidx.graphics.shapes.DoubleMapper (FloatMapping.kt).
 */
export class DoubleMapper {
    private readonly sourceValues: number[];
    private readonly targetValues: number[];

    constructor(mappings: [number, number][]) {
        this.sourceValues = mappings.map((m) => m[0]);
        this.targetValues = mappings.map((m) => m[1]);
        validateProgress(this.sourceValues);
        validateProgress(this.targetValues);
    }

    map(x: number): number {
        return linearMap(this.sourceValues, this.targetValues, x);
    }

    mapBack(x: number): number {
        return linearMap(this.targetValues, this.sourceValues, x);
    }

    static readonly Identity = new DoubleMapper([
        [0, 0],
        [0.5, 0.5],
    ]);
}
