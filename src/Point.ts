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

// These will be moved to their own files
export interface TransformResult {
    first: number;
    second: number;
}

export interface PointTransformer {
    transform(x: number, y: number): TransformResult;
}

function interpolate(start: number, stop: number, fraction: number): number {
    return start + (stop - start) * fraction;
}


export class Point {
    constructor(public x: number, public y: number) {}

    static interpolate(start: Point, stop: Point, fraction: number): Point {
        return new Point(interpolate(start.x, stop.x, fraction), interpolate(start.y, stop.y, fraction));
    }

    copy(x: number = this.x, y: number = this.y): Point {
        return new Point(x, y);
    }

    getDistance(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    getDistanceSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    dotProduct(other: Point): number;
    dotProduct(otherX: number, otherY: number): number;
    dotProduct(otherOrX: Point | number, otherY?: number): number {
        if (otherOrX instanceof Point) {
            return this.x * otherOrX.x + this.y * otherOrX.y;
        } else {
            return this.x * otherOrX + this.y * otherY!;
        }
    }

    clockwise(other: Point): boolean {
        return this.x * other.y - this.y * other.x > 0;
    }

    getDirection(): Point {
        const d = this.getDistance();
        if (d <= 0) {
            throw new Error("Can't get the direction of a 0-length vector");
        }
        return this.div(d);
    }

    unaryMinus(): Point {
        return new Point(-this.x, -this.y);
    }

    minus(other: Point): Point {
        return new Point(this.x - other.x, this.y - other.y);
    }

    plus(other: Point): Point {
        return new Point(this.x + other.x, this.y + other.y);
    }

    times(operand: number): Point {
        return new Point(this.x * operand, this.y * operand);
    }

    div(operand: number): Point {
        return new Point(this.x / operand, this.y / operand);
    }

    rem(operand: number): Point {
        return new Point(this.x % operand, this.y % operand);
    }

    transformed(f: PointTransformer): Point {
        const result = f.transform(this.x, this.y);
        return new Point(result.first, result.second);
    }

    rotate90(): Point {
        return new Point(-this.y, this.x);
    }
}
