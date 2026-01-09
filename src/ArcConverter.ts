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

import { Cubic } from './Cubic.js';

export class ArcConverter {
    static arcToCubics(
        x0: number, y0: number, x1: number, y1: number,
        a: number, b: number, theta: number,
        isMoreThanHalf: boolean, isPositiveArc: boolean
    ): Cubic[] {
        const thetaD = theta / 180 * Math.PI;
        const cosTheta = Math.cos(thetaD);
        const sinTheta = Math.sin(thetaD);

        const x0p = (x0 * cosTheta + y0 * sinTheta) / a;
        const y0p = (-x0 * sinTheta + y0 * cosTheta) / b;
        const x1p = (x1 * cosTheta + y1 * sinTheta) / a;
        const y1p = (-x1 * sinTheta + y1 * cosTheta) / b;

        const dx = x0p - x1p;
        const dy = y0p - y1p;
        const xm = (x0p + x1p) / 2;
        const ym = (y0p + y1p) / 2;
        const dsq = dx * dx + dy * dy;
        if (dsq === 0) return [];

        let disc = 1 / dsq - 1 / 4;
        if (disc < 0) {
            const adjust = Math.sqrt(dsq) / 1.99999;
            return ArcConverter.arcToCubics(
                x0, y0, x1, y1,
                a * adjust, b * adjust, theta,
                isMoreThanHalf, isPositiveArc
            );
        }

        const s = Math.sqrt(disc);
        const sdx = s * dx;
        const sdy = s * dy;
        let cx: number, cy: number;
        if (isMoreThanHalf === isPositiveArc) {
            cx = xm - sdy;
            cy = ym + sdx;
        } else {
            cx = xm + sdy;
            cy = ym - sdx;
        }

        const eta0 = Math.atan2(y0p - cy, x0p - cx);
        const eta1 = Math.atan2(y1p - cy, x1p - cx);
        let sweep = eta1 - eta0;
        if (isPositiveArc !== (sweep >= 0)) {
            if (sweep > 0) {
                sweep -= 2 * Math.PI;
            } else {
                sweep += 2 * Math.PI;
            }
        }

        cx *= a;
        cy *= b;
        const tcx = cx;
        cx = cx * cosTheta - cy * sinTheta;
        cy = tcx * sinTheta + cy * cosTheta;

        return ArcConverter.arcToBezier(
            cx, cy, a, b, x0, y0, thetaD, eta0, sweep
        );
    }

    private static arcToBezier(
        cx: number, cy: number, rx: number, ry: number,
        e1x: number, e1y: number, theta: number,
        start: number, sweep: number
    ): Cubic[] {
        const cubics: Cubic[] = [];
        let ce1x = e1x;
        let ce1y = e1y;
        const numSegments = Math.ceil(Math.abs(sweep * 4 / Math.PI));
        let eta1 = start;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const cosEta1 = Math.cos(eta1);
        const sinEta1 = Math.sin(eta1);
        let ep1x = -rx * cosTheta * sinEta1 - ry * sinTheta * cosEta1;
        let ep1y = -rx * sinTheta * sinEta1 + ry * cosTheta * cosEta1;
        const anglePerSegment = sweep / numSegments;

        for (let i = 0; i < numSegments; i++) {
            const eta2 = eta1 + anglePerSegment;
            const sinEta2 = Math.sin(eta2);
            const cosEta2 = Math.cos(eta2);
            const e2x = cx + rx * cosTheta * cosEta2 - ry * sinTheta * sinEta2;
            const e2y = cy + rx * sinTheta * cosEta2 + ry * cosTheta * sinEta2;
            const ep2x = -rx * cosTheta * sinEta2 - ry * sinTheta * cosEta2;
            const ep2y = -rx * sinTheta * sinEta2 + ry * cosTheta * sinEta2;
            const tanDiff2 = Math.tan((eta2 - eta1) / 2);
            const alpha =
                Math.sin(eta2 - eta1) * (Math.sqrt(4 + 3 * tanDiff2 * tanDiff2) - 1) / 3;
            const q1x = ce1x + alpha * ep1x;
            const q1y = ce1y + alpha * ep1y;
            const q2x = e2x - alpha * ep2x;
            const q2y = e2y - alpha * ep2y;

            cubics.push(
                new Cubic([ce1x, ce1y, q1x, q1y, q2x, q2y, e2x, e2y])
            );
            eta1 = eta2;
            ce1x = e2x;
            ce1y = e2y;
            ep1x = ep2x;
            ep1y = ep2y;
        }
        return cubics;
    }
}
