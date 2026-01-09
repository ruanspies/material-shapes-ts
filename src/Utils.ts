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

import { Point } from './Point.js';

export function distance(x: number, y: number): number {
    return Math.sqrt(x * x + y * y);
}

export function distanceSquared(x: number, y: number): number {
    return x * x + y * y;
}

export function directionVector(x: number, y: number): Point;
export function directionVector(angleRadians: number): Point;
export function directionVector(xOrAngle: number, y?: number): Point {
    if (y !== undefined) {
        const d = distance(xOrAngle, y);
        if (d <= 0) {
            throw new Error("Required distance greater than zero");
        }
        return new Point(xOrAngle / d, y / d);
    } else {
        return new Point(Math.cos(xOrAngle), Math.sin(xOrAngle));
    }
}

export function radialToCartesian(
    radius: number,
    angleRadians: number,
    center: Point = new Point(0, 0)
): Point {
    return directionVector(angleRadians).times(radius).plus(center);
}

export const DistanceEpsilon = 1e-4;
export const AngleEpsilon = 1e-6;
export const RelaxedDistanceEpsilon = 5e-3;

export const Zero = new Point(0, 0);
export const FloatPi = Math.PI;
export const TwoPi = 2 * Math.PI;

export function square(x: number): number {
    return x * x;
}

export function interpolate(start: number, stop: number, fraction: number): number {
    return (1 - fraction) * start + fraction * stop;
}

export function positiveModulo(num: number, mod: number): number {
    return ((num % mod) + mod) % mod;
}

export function collinearIsh(
    aX: number, aY: number,
    bX: number, bY: number,
    cX: number, cY: number,
    tolerance: number = DistanceEpsilon
): boolean {
    const ab = new Point(bX - aX, bY - aY).rotate90();
    const ac = new Point(cX - aX, cY - aY);
    const dotProduct = Math.abs(ab.dotProduct(ac));
    const relativeTolerance = tolerance * ab.getDistance() * ac.getDistance();
    return dotProduct < tolerance || dotProduct < relativeTolerance;
}

export function convex(previous: Point, current: Point, next: Point): boolean {
    return current.minus(previous).clockwise(next.minus(current));
}

export interface FindMinimumFunction {
    (value: number): number;
}

export function findMinimum(
    v0: number,
    v1: number,
    tolerance: number = 1e-3,
    f: FindMinimumFunction
): number {
    let a = v0;
    let b = v1;
    while (b - a > tolerance) {
        const c1 = (2 * a + b) / 3;
        const c2 = (2 * b + a) / 3;
        if (f(c1) < f(c2)) {
            b = c2;
        } else {
            a = c1;
        }
    }
    return (a + b) / 2;
}

export const DEBUG = false;

export function debugLog(tag: string, messageFactory: () => string): void {
    if (DEBUG) {
        console.log(`${tag}: ${messageFactory()}`);
    }
}
