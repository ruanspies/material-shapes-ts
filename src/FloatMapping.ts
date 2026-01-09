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

import { DistanceEpsilon } from './Utils.js';

export function progressInRange(progress: number, progressFrom: number, progressTo: number): boolean {
    if (progressTo >= progressFrom) {
        return progress >= progressFrom && progress <= progressTo;
    } else {
        return progress >= progressFrom || progress <= progressTo;
    }
}

export function linearMap(xValues: number[], yValues: number[], x: number): number {
    if (x < 0 || x > 1) throw new Error(`Invalid progress: ${x}`);

    const segmentStartIndex = xValues.findIndex((_, i) =>
        progressInRange(x, xValues[i], xValues[(i + 1) % xValues.length])
    );
    const segmentEndIndex = (segmentStartIndex + 1) % xValues.length;
    const segmentSizeX = (xValues[segmentEndIndex] - xValues[segmentStartIndex] + 1) % 1;
    const segmentSizeY = (yValues[segmentEndIndex] - yValues[segmentStartIndex] + 1) % 1;
    const positionInSegment =
        segmentSizeX < 0.001
            ? 0.5
            : ((x - xValues[segmentStartIndex] + 1) % 1) / segmentSizeX;
    return (yValues[segmentStartIndex] + segmentSizeY * positionInSegment + 1) % 1;
}


export function validateProgress(p: number[]): void {
    let prev = p[p.length - 1];
    let wraps = 0;
    for (let i = 0; i < p.length; i++) {
        const curr = p[i];
        if (curr < 0 || curr >= 1) {
            throw new Error(`FloatMapping - Progress outside of range: ${p.join(", ")}`);
        }
        if (progressDistance(curr, prev) < DistanceEpsilon) {
            throw new Error(`FloatMapping - Progress repeats a value: ${p.join(", ")}`);
        }
        if (curr < prev) {
            wraps++;
            if (wraps > 1) {
                throw new Error(`FloatMapping - Progress wraps more than once: ${p.join(", ")}`);
            }
        }
        prev = curr;
    }
}

export function progressDistance(p1: number, p2: number): number {
    const diff = Math.abs(p1 - p2);
    return Math.min(diff, 1 - diff);
}
