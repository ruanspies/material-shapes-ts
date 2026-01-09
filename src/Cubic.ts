/*
 * Copyright 2022 The Android Open Source Project
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

import { Point, PointTransformer } from './Point.js';
import { convex, directionVector, distance, DistanceEpsilon, interpolate } from './Utils.js';

export class Cubic {
    constructor(public points: number[] = [0, 0, 0, 0, 0, 0, 0, 0]) {
        if (points.length !== 8) {
            throw new Error("Points array size should be 8");
        }
    }

    get anchor0X(): number { return this.points[0]; }
    get anchor0Y(): number { return this.points[1]; }
    get control0X(): number { return this.points[2]; }
    get control0Y(): number { return this.points[3]; }
    get control1X(): number { return this.points[4]; }
    get control1Y(): number { return this.points[5]; }
    get anchor1X(): number { return this.points[6]; }
    get anchor1Y(): number { return this.points[7]; }

    static fromPoints(anchor0: Point, control0: Point, control1: Point, anchor1: Point): Cubic {
        return new Cubic([
            anchor0.x, anchor0.y,
            control0.x, control0.y,
            control1.x, control1.y,
            anchor1.x, anchor1.y,
        ]);
    }

    pointOnCurve(t: number): Point {
        const u = 1 - t;
        return new Point(
            this.anchor0X * (u * u * u) +
                this.control0X * (3 * t * u * u) +
                this.control1X * (3 * t * t * u) +
                this.anchor1X * (t * t * t),
            this.anchor0Y * (u * u * u) +
                this.control0Y * (3 * t * u * u) +
                this.control1Y * (3 * t * t * u) +
                this.anchor1Y * (t * t * t),
        );
    }

    zeroLength(): boolean {
        return Math.abs(this.anchor0X - this.anchor1X) < DistanceEpsilon &&
               Math.abs(this.anchor0Y - this.anchor1Y) < DistanceEpsilon;
    }

    convexTo(next: Cubic): boolean {
        const prevVertex = new Point(this.anchor0X, this.anchor0Y);
        const currVertex = new Point(this.anchor1X, this.anchor1Y);
        const nextVertex = new Point(next.anchor1X, next.anchor1Y);
        return convex(prevVertex, currVertex, nextVertex);
    }

    private zeroIsh(value: number): boolean {
        return Math.abs(value) < DistanceEpsilon;
    }

    calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate: boolean = false): void {
        if (this.zeroLength()) {
            bounds[0] = this.anchor0X;
            bounds[1] = this.anchor0Y;
            bounds[2] = this.anchor0X;
            bounds[3] = this.anchor0Y;
            return;
        }

        let minX = Math.min(this.anchor0X, this.anchor1X);
        let minY = Math.min(this.anchor0Y, this.anchor1Y);
        let maxX = Math.max(this.anchor0X, this.anchor1X);
        let maxY = Math.max(this.anchor0Y, this.anchor1Y);

        if (approximate) {
            bounds[0] = Math.min(minX, this.control0X, this.control1X);
            bounds[1] = Math.min(minY, this.control0Y, this.control1Y);
            bounds[2] = Math.max(maxX, this.control0X, this.control1X);
            bounds[3] = Math.max(maxY, this.control0Y, this.control1Y);
            return;
        }

        const xa = -this.anchor0X + 3 * this.control0X - 3 * this.control1X + this.anchor1X;
        const xb = 2 * this.anchor0X - 4 * this.control0X + 2 * this.control1X;
        const xc = -this.anchor0X + this.control0X;

        if (this.zeroIsh(xa)) {
            if (xb !== 0) {
                const t = 2 * xc / (-2 * xb);
                if (t >= 0 && t <= 1) {
                    const x = this.pointOnCurve(t).x;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }
            }
        } else {
            const xs = xb * xb - 4 * xa * xc;
            if (xs >= 0) {
                const sqrtXs = Math.sqrt(xs);
                const t1 = (-xb + sqrtXs) / (2 * xa);
                if (t1 >= 0 && t1 <= 1) {
                    const x = this.pointOnCurve(t1).x;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }
                const t2 = (-xb - sqrtXs) / (2 * xa);
                if (t2 >= 0 && t2 <= 1) {
                    const x = this.pointOnCurve(t2).x;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }
            }
        }

        const ya = -this.anchor0Y + 3 * this.control0Y - 3 * this.control1Y + this.anchor1Y;
        const yb = 2 * this.anchor0Y - 4 * this.control0Y + 2 * this.control1Y;
        const yc = -this.anchor0Y + this.control0Y;

        if (this.zeroIsh(ya)) {
            if (yb !== 0) {
                const t = 2 * yc / (-2 * yb);
                if (t >= 0 && t <= 1) {
                    const y = this.pointOnCurve(t).y;
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        } else {
            const ys = yb * yb - 4 * ya * yc;
            if (ys >= 0) {
                const sqrtYs = Math.sqrt(ys);
                const t1 = (-yb + sqrtYs) / (2 * ya);
                if (t1 >= 0 && t1 <= 1) {
                    const y = this.pointOnCurve(t1).y;
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
                const t2 = (-yb - sqrtYs) / (2 * ya);
                if (t2 >= 0 && t2 <= 1) {
                    const y = this.pointOnCurve(t2).y;
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        bounds[0] = minX;
        bounds[1] = minY;
        bounds[2] = maxX;
        bounds[3] = maxY;
    }

    split(t: number): [Cubic, Cubic] {
        const u = 1 - t;
        const pointOnCurve = this.pointOnCurve(t);
        const first = new Cubic([
            this.anchor0X,
            this.anchor0Y,
            this.anchor0X * u + this.control0X * t,
            this.anchor0Y * u + this.control0Y * t,
            this.anchor0X * (u * u) + this.control0X * (2 * u * t) + this.control1X * (t * t),
            this.anchor0Y * (u * u) + this.control0Y * (2 * u * t) + this.control1Y * (t * t),
            pointOnCurve.x,
            pointOnCurve.y,
        ]);
        const second = new Cubic([
            pointOnCurve.x,
            pointOnCurve.y,
            this.control0X * (u * u) + this.control1X * (2 * u * t) + this.anchor1X * (t * t),
            this.control0Y * (u * u) + this.control1Y * (2 * u * t) + this.anchor1Y * (t * t),
            this.control1X * u + this.anchor1X * t,
            this.control1Y * u + this.anchor1Y * t,
            this.anchor1X,
            this.anchor1Y,
        ]);
        return [first, second];
    }

    reverse(): Cubic {
        return new Cubic([
            this.anchor1X, this.anchor1Y,
            this.control1X, this.control1Y,
            this.control0X, this.control0Y,
            this.anchor0X, this.anchor0Y,
        ]);
    }

    plus(o: Cubic): Cubic {
        return new Cubic(this.points.map((p, i) => p + o.points[i]));
    }

    times(x: number): Cubic {
        return new Cubic(this.points.map(p => p * x));
    }

    div(x: number): Cubic {
        return this.times(1 / x);
    }

    toString(): string {
        return `anchor0: (${this.anchor0X}, ${this.anchor0Y}) ` +
               `control0: (${this.control0X}, ${this.control0Y}), ` +
               `control1: (${this.control1X}, ${this.control1Y}), ` +
               `anchor1: (${this.anchor1X}, ${this.anchor1Y})`;
    }

    equals(other: any): boolean {
        if (this === other) return true;
        if (!(other instanceof Cubic)) return false;
        return this.points.every((p, i) => p === other.points[i]);
    }

    transformed(f: PointTransformer): Cubic {
        const newCubic = new MutableCubic();
        newCubic.points = [...this.points];
        newCubic.transform(f);
        return newCubic;
    }

    static straightLine(x0: number, y0: number, x1: number, y1: number): Cubic {
        return new Cubic([
            x0, y0,
            interpolate(x0, x1, 1 / 3), interpolate(y0, y1, 1 / 3),
            interpolate(x0, x1, 2 / 3), interpolate(y0, y1, 2 / 3),
            x1, y1
        ]);
    }

    static circularArc(
        centerX: number, centerY: number,
        x0: number, y0: number,
        x1: number, y1: number
    ): Cubic {
        const p0d = directionVector(x0 - centerX, y0 - centerY);
        const p1d = directionVector(x1 - centerX, y1 - centerY);
        const rotatedP0 = p0d.rotate90();
        const rotatedP1 = p1d.rotate90();
        const clockwise = rotatedP0.dotProduct(x1 - centerX, y1 - centerY) >= 0;
        const cosa = p0d.dotProduct(p1d);
        if (cosa > 0.999) return Cubic.straightLine(x0, y0, x1, y1);
        const k = distance(x0 - centerX, y0 - centerY) * 4 / 3 *
            (Math.sqrt(2 * (1 - cosa)) - Math.sqrt(1 - cosa * cosa)) / (1 - cosa) *
            (clockwise ? 1 : -1);
        return new Cubic([
            x0, y0,
            x0 + rotatedP0.x * k, y0 + rotatedP0.y * k,
            x1 - rotatedP1.x * k, y1 - rotatedP1.y * k,
            x1, y1
        ]);
    }

    static empty(x0: number, y0: number): Cubic {
        return new Cubic([x0, y0, x0, y0, x0, y0, x0, y0]);
    }

    static extend(a: Cubic, b: Cubic): Cubic {
        if (a.zeroLength()) {
            return new Cubic([
                a.anchor0X, a.anchor0Y,
                b.control0X, b.control0Y,
                b.control1X, b.control1Y,
                b.anchor1X, b.anchor1Y,
            ]);
        } else {
            return new Cubic([
                a.anchor0X, a.anchor0Y,
                a.control0X, a.control0Y,
                a.control1X, a.control1Y,
                b.anchor1X, b.anchor1Y,
            ]);
        }
    }
}

export class MutableCubic extends Cubic {
    private transformOnePoint(f: PointTransformer, ix: number): void {
        const result = f.transform(this.points[ix], this.points[ix + 1]);
        this.points[ix] = result.first;
        this.points[ix + 1] = result.second;
    }

    transform(f: PointTransformer): void {
        this.transformOnePoint(f, 0);
        this.transformOnePoint(f, 2);
        this.transformOnePoint(f, 4);
        this.transformOnePoint(f, 6);
    }

    interpolate(c1: Cubic, c2: Cubic, progress: number): void {
        for (let i = 0; i < 8; i++) {
            this.points[i] = interpolate(c1.points[i], c2.points[i], progress);
        }
    }
}
