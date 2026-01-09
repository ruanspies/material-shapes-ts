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

export class DoubleMapper {
    constructor(private mapping: [number, number][]) {}

    map(value: number): number {
        // Find the two pairs in the mapping that the value falls between
        let p1: [number, number] = [0, 0], p2: [number, number] = [1, 1];
        for (let i = 0; i < this.mapping.length; i++) {
            if (this.mapping[i][0] <= value) {
                p1 = this.mapping[i];
            }
            if (this.mapping[i][0] >= value) {
                p2 = this.mapping[i];
                break;
            }
        }
        if (p1[0] === p2[0]) return p1[1];
        const progress = (value - p1[0]) / (p2[0] - p1[0]);
        return p1[1] + progress * (p2[1] - p1[1]);
    }

    mapBack(value: number): number {
        let p1: [number, number] = [0, 0], p2: [number, number] = [1, 1];
        for (let i = 0; i < this.mapping.length; i++) {
            if (this.mapping[i][1] <= value) {
                p1 = this.mapping[i];
            }
            if (this.mapping[i][1] >= value) {
                p2 = this.mapping[i];
                break;
            }
        }
        if (p1[1] === p2[1]) return p1[0];
        const progress = (value - p1[1]) / (p2[1] - p1[1]);
        return p1[0] + progress * (p2[0] - p1[0]);
    }
}
