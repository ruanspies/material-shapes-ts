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

import { CornerRounding } from './CornerRounding.js';
import { Point } from './Point.js';
import { RoundedPolygon } from './RoundedPolygon.js';
import { FloatPi, interpolate, radialToCartesian, TwoPi } from './Utils.js';

export class Shapes {
    static circle(
        numVertices: number = 8,
        radius: number = 1,
        centerX: number = 0,
        centerY: number = 0,
    ): RoundedPolygon {
        if (numVertices < 3) throw new Error("Circle must have at least three vertices");

        const theta = FloatPi / numVertices;
        const polygonRadius = radius / Math.cos(theta);
        return RoundedPolygon.createFromNumVertices(
            numVertices,
            polygonRadius,
            centerX,
            centerY,
            new CornerRounding(radius)
        );
    }

    static rectangle(
        width: number = 2,
        height: number = 2,
        rounding: CornerRounding = CornerRounding.Unrounded,
        perVertexRounding?: CornerRounding[],
        centerX: number = 0,
        centerY: number = 0,
    ): RoundedPolygon {
        const left = centerX - width / 2;
        const top = centerY - height / 2;
        const right = centerX + width / 2;
        const bottom = centerY + height / 2;

        return RoundedPolygon.createFromVertices(
            [right, bottom, left, bottom, left, top, right, top],
            rounding,
            perVertexRounding,
            centerX,
            centerY
        );
    }

    static star(
        numVerticesPerRadius: number,
        radius: number = 1,
        innerRadius: number = 0.5,
        rounding: CornerRounding = CornerRounding.Unrounded,
        innerRounding?: CornerRounding,
        perVertexRounding?: CornerRounding[],
        centerX: number = 0,
        centerY: number = 0,
    ): RoundedPolygon {
        if (radius <= 0 || innerRadius <= 0) {
            throw new Error("Star radii must both be greater than 0");
        }
        if (innerRadius >= radius) {
            throw new Error("innerRadius must be less than radius");
        }

        let pvRounding = perVertexRounding;
        if (!pvRounding && innerRounding) {
            pvRounding = Array.from({ length: numVerticesPerRadius })
                .flatMap(() => [rounding, innerRounding]);
        }

        return RoundedPolygon.createFromVertices(
            starVerticesFromNumVerts(numVerticesPerRadius, radius, innerRadius, centerX, centerY),
            rounding,
            pvRounding,
            centerX,
            centerY
        );
    }

    static pill(
        width: number = 2,
        height: number = 1,
        smoothing: number = 0,
        centerX: number = 0,
        centerY: number = 0,
    ): RoundedPolygon {
        if (width <= 0 || height <= 0) {
            throw new Error("Pill shapes must have positive width and height");
        }

        const wHalf = width / 2;
        const hHalf = height / 2;
        return RoundedPolygon.createFromVertices(
            [
                wHalf + centerX, hHalf + centerY,
                -wHalf + centerX, hHalf + centerY,
                -wHalf + centerX, -hHalf + centerY,
                wHalf + centerX, -hHalf + centerY,
            ],
            new CornerRounding(Math.min(wHalf, hHalf), smoothing),
            undefined,
            centerX,
            centerY
        );
    }

    static pillStar(
        width: number = 2,
        height: number = 1,
        numVerticesPerRadius: number = 8,
        innerRadiusRatio: number = 0.5,
        rounding: CornerRounding = CornerRounding.Unrounded,
        innerRounding?: CornerRounding,
        perVertexRounding?: CornerRounding[],
        vertexSpacing: number = 0.5,
        startLocation: number = 0,
        centerX: number = 0,
        centerY: number = 0,
    ): RoundedPolygon {
        if (width <= 0 || height <= 0) {
            throw new Error("Pill shapes must have positive width and height");
        }
        if (innerRadiusRatio <= 0 || innerRadiusRatio > 1) {
            throw new Error("innerRadius must be between 0 and 1");
        }

        let pvRounding = perVertexRounding;
        if (!pvRounding && innerRounding) {
            pvRounding = Array.from({ length: numVerticesPerRadius })
                .flatMap(() => [rounding, innerRounding]);
        }

        return RoundedPolygon.createFromVertices(
            pillStarVerticesFromNumVerts(
                numVerticesPerRadius, width, height, innerRadiusRatio,
                vertexSpacing, startLocation, centerX, centerY
            ),
            rounding,
            pvRounding,
            centerX,
            centerY
        );
    }
}

function starVerticesFromNumVerts(
    numVerticesPerRadius: number,
    radius: number,
    innerRadius: number,
    centerX: number,
    centerY: number,
): number[] {
    const result: number[] = [];
    for (let i = 0; i < numVerticesPerRadius; i++) {
        let vertex = radialToCartesian(radius, (FloatPi / numVerticesPerRadius * 2 * i));
        result.push(vertex.x + centerX, vertex.y + centerY);
        vertex = radialToCartesian(innerRadius, (FloatPi / numVerticesPerRadius * (2 * i + 1)));
        result.push(vertex.x + centerX, vertex.y + centerY);
    }
    return result;
}

function pillStarVerticesFromNumVerts(
    numVerticesPerRadius: number,
    width: number,
    height: number,
    innerRadius: number,
    vertexSpacing: number,
    startLocation: number,
    centerX: number,
    centerY: number,
): number[] {
    const endcapRadius = Math.min(width, height);
    const vSegLen = Math.max(0, height - width);
    const hSegLen = Math.max(0, width - height);
    const vSegHalf = vSegLen / 2;
    const hSegHalf = hSegLen / 2;
    const circlePerimeter = TwoPi * endcapRadius * interpolate(innerRadius, 1, vertexSpacing);
    const perimeter = 2 * hSegLen + 2 * vSegLen + circlePerimeter;

    const sections = [
        0,
        vSegLen / 2,
        vSegLen / 2 + circlePerimeter / 4,
        vSegLen / 2 + circlePerimeter / 4 + hSegLen,
        vSegLen / 2 + circlePerimeter / 4 + hSegLen + circlePerimeter / 4,
        vSegLen / 2 + circlePerimeter / 4 + hSegLen + circlePerimeter / 4 + vSegLen,
        vSegLen / 2 + circlePerimeter / 4 + hSegLen + circlePerimeter / 4 + vSegLen +
            circlePerimeter / 4,
        vSegLen / 2 + circlePerimeter / 4 + hSegLen + circlePerimeter / 4 + vSegLen +
            circlePerimeter / 4 + hSegLen,
        vSegLen / 2 + circlePerimeter / 4 + hSegLen + circlePerimeter / 4 + vSegLen +
            circlePerimeter / 4 + hSegLen + circlePerimeter / 4,
        vSegLen / 2 + circlePerimeter / 4 + hSegLen + circlePerimeter / 4 + vSegLen +
            circlePerimeter / 4 + hSegLen + circlePerimeter / 4 + vSegLen / 2,
        perimeter
    ];

    const tPerVertex = perimeter / (2 * numVerticesPerRadius);
    let isInner = false;
    let currSecIndex = 0;
    let t = startLocation * perimeter;

    const result: number[] = [];
    const rectBR = new Point(hSegHalf, vSegHalf);
    const rectBL = new Point(-hSegHalf, vSegHalf);
    const rectTL = new Point(-hSegHalf, -vSegHalf);
    const rectTR = new Point(hSegHalf, -vSegHalf);

    for (let i = 0; i < numVerticesPerRadius * 2; i++) {
        const boundedT = t % perimeter;
        if (boundedT < sections[currSecIndex]) {
            currSecIndex = 0;
        }
        while (boundedT >= sections[currSecIndex + 1]) {
            currSecIndex++;
        }

        const secStart = sections[currSecIndex];
        const secEnd = sections[currSecIndex + 1];
        const tInSection = boundedT - secStart;
        const tProportion = tInSection / (secEnd - secStart);
        const currRadius = isInner ? (endcapRadius * innerRadius) : endcapRadius;

        let vertex: Point;
        switch (currSecIndex) {
            case 0:
                vertex = new Point(currRadius, tProportion * vSegHalf);
                break;
            case 1:
                vertex = radialToCartesian(currRadius, tProportion * FloatPi / 2).plus(rectBR);
                break;
            case 2:
                vertex = new Point(hSegHalf - tProportion * hSegLen, currRadius);
                break;
            case 3:
                vertex = radialToCartesian(
                    currRadius, FloatPi / 2 + (tProportion * FloatPi / 2)).plus(rectBL);
                break;
            case 4:
                vertex = new Point(-currRadius, vSegHalf - tProportion * vSegLen);
                break;
            case 5:
                vertex = radialToCartesian(
                    currRadius, FloatPi + (tProportion * FloatPi / 2)).plus(rectTL);
                break;
            case 6:
                vertex = new Point(-hSegHalf + tProportion * hSegLen, -currRadius);
                break;
            case 7:
                vertex = radialToCartesian(
                    currRadius, FloatPi * 1.5 + (tProportion * FloatPi / 2)).plus(rectTR);
                break;
            default: // 8
                vertex = new Point(currRadius, -vSegHalf + tProportion * vSegHalf);
                break;
        }
        result.push(vertex.x + centerX, vertex.y + centerY);
        t += tPerVertex;
        isInner = !isInner;
    }
    return result;
}
