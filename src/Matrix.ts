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

import { PointTransformer, TransformResult } from './Point.js';

/**
 * A 3x3 matrix for 2D transformations. The matrix is in row-major order.
 */
export class Matrix implements PointTransformer {
    private matrix: number[];

    /**
     * Creates an identity matrix.
     */
    constructor() {
        this.matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    /**
     * Rotates the matrix by the given angle in degrees.
     */
    rotateZ(angle: number) {
        const radians = angle * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const rotationMatrix = [cos, -sin, 0, sin, cos, 0, 0, 0, 1];
        this.multiply(rotationMatrix);
        return this;
    }

    /**
     * Scales the matrix by the given factors.
     */
    scale(x: number, y: number) {
        const scaleMatrix = [x, 0, 0, 0, y, 0, 0, 0, 1];
        this.multiply(scaleMatrix);
        return this;
    }

    /**
     * Transforms the given point by this matrix.
     */
    transform(x: number, y: number): TransformResult {
        const newX = this.matrix[0] * x + this.matrix[1] * y + this.matrix[2];
        const newY = this.matrix[3] * x + this.matrix[4] * y + this.matrix[5];
        return { first: newX, second: newY };
    }

    /**
     * Multiplies this matrix by another matrix.
     */
    private multiply(other: number[]) {
        const result = [0, 0, 0, 0, 0, 0, 0, 0, 1];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let sum = 0;
                for (let k = 0; k < 3; k++) {
                    sum += this.matrix[i * 3 + k] * other[k * 3 + j];
                }
                result[i * 3 + j] = sum;
            }
        }
        this.matrix = result;
    }
}
