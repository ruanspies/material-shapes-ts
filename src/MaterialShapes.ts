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

import { CornerRounding } from './CornerRounding.js';
import { Morph } from './Morph.js';
import { RoundedPolygon } from './RoundedPolygon.js';
import { Shapes } from './Shapes.js';
import { Point } from './Point.js';
import { Path } from './Path.js';
import { Shape } from './Shape.js';
import { Matrix } from './Matrix.js';
import { Size } from './Size.js';
import { Offset } from './Offset.js';

export function morphToPath(morph: Morph, progress: number, path: Path = new Path(), startAngle: number = 0): Path {
    const cubics = morph.asCubics(progress);
    path.moveTo(cubics[0].anchor0X, cubics[0].anchor0Y);
    for (const cubic of cubics) {
        path.cubicTo(
            cubic.control0X,
            cubic.control0Y,
            cubic.control1X,
            cubic.control1Y,
            cubic.anchor1X,
            cubic.anchor1Y
        );
    }
    path.close();
    return path;
}

export function roundedPolygonToPath(polygon: RoundedPolygon, startAngle: number = 0): Path {
    const path = new Path();
    const cubics = polygon.cubics;
    path.moveTo(cubics[0].anchor0X, cubics[0].anchor0Y);
    for (const cubic of cubics) {
        path.cubicTo(
            cubic.control0X,
            cubic.control0Y,
            cubic.control1X,
            cubic.control1Y,
            cubic.anchor1X,
            cubic.anchor1Y
        );
    }
    path.close();
    return path;
}

class PolygonShape extends Shape {
    constructor(private polygon: RoundedPolygon, private startAngle: number) {
        super();
    }

    createOutline(size: Size, layoutDirection: any, density: any): { path: Path } {
        const path = roundedPolygonToPath(this.polygon, this.startAngle);
        // This is a simplified implementation. A real implementation would need to handle
        // scaling and translation to fit the size.
        return { path };
    }
}

export function roundedPolygonToShape(polygon: RoundedPolygon, startAngle: number = 0): Shape {
    return new PolygonShape(polygon, startAngle);
}

class PointNRound {
    constructor(
        public o: Offset,
        public r: CornerRounding = CornerRounding.Unrounded
    ) {}
}

export class MaterialShapes {
    private static cornerRound15 = new CornerRounding(0.15);
    private static cornerRound20 = new CornerRounding(0.2);
    private static cornerRound30 = new CornerRounding(0.3);
    private static cornerRound50 = new CornerRounding(0.5);
    private static cornerRound100 = new CornerRounding(1);

    private static rotateNeg45 = new Matrix().rotateZ(-45);
    private static rotateNeg90 = new Matrix().rotateZ(-90);
    private static rotateNeg135 = new Matrix().rotateZ(-135);

    private static _circle?: RoundedPolygon;
    private static _square?: RoundedPolygon;
    private static _slanted?: RoundedPolygon;
    private static _arch?: RoundedPolygon;
    private static _fan?: RoundedPolygon;
    private static _arrow?: RoundedPolygon;
    private static _semiCircle?: RoundedPolygon;
    private static _oval?: RoundedPolygon;
    private static _pill?: RoundedPolygon;
    private static _triangle?: RoundedPolygon;
    private static _diamond?: RoundedPolygon;
    private static _clamShell?: RoundedPolygon;
    private static _pentagon?: RoundedPolygon;
    private static _gem?: RoundedPolygon;
    private static _verySunny?: RoundedPolygon;
    private static _sunny?: RoundedPolygon;
    private static _cookie4Sided?: RoundedPolygon;
    private static _cookie6Sided?: RoundedPolygon;
    private static _cookie7Sided?: RoundedPolygon;
    private static _cookie9Sided?: RoundedPolygon;
    private static _cookie12Sided?: RoundedPolygon;
    private static _ghostish?: RoundedPolygon;
    private static _clover4Leaf?: RoundedPolygon;
    private static _clover8Leaf?: RoundedPolygon;
    private static _burst?: RoundedPolygon;
    private static _softBurst?: RoundedPolygon;
    private static _boom?: RoundedPolygon;
    private static _softBoom?: RoundedPolygon;
    private static _flower?: RoundedPolygon;
    private static _puffy?: RoundedPolygon;
    private static _puffyDiamond?: RoundedPolygon;
    private static _pixelCircle?: RoundedPolygon;
    private static _pixelTriangle?: RoundedPolygon;
    private static _bun?: RoundedPolygon;
    private static _heart?: RoundedPolygon;

    static get Circle(): RoundedPolygon {
        if (!this._circle) {
            this._circle = Shapes.circle().normalized();
        }
        return this._circle!;
    }

    static get Square(): RoundedPolygon {
        if (!this._square) {
            this._square = this.square().normalized();
        }
        return this._square!;
    }

    static get Slanted(): RoundedPolygon {
        if (!this._slanted) {
            this._slanted = this.slanted().normalized();
        }
        return this._slanted!;
    }

    static get Arch(): RoundedPolygon {
        if (!this._arch) {
            this._arch = this.arch().normalized();
        }
        return this._arch!;
    }

    static get Fan(): RoundedPolygon {
        if (!this._fan) {
            this._fan = this.fan().normalized();
        }
        return this._fan!;
    }

    static get Arrow(): RoundedPolygon {
        if (!this._arrow) {
            this._arrow = this.arrow().normalized();
        }
        return this._arrow!;
    }

    static get SemiCircle(): RoundedPolygon {
        if (!this._semiCircle) {
            this._semiCircle = this.semiCircle().normalized();
        }
        return this._semiCircle!;
    }

    static get Oval(): RoundedPolygon {
        if (!this._oval) {
            this._oval = this.oval().normalized();
        }
        return this._oval!;
    }

    static get Pill(): RoundedPolygon {
        if (!this._pill) {
            this._pill = this.pill().normalized();
        }
        return this._pill!;
    }

    static get Triangle(): RoundedPolygon {
        if (!this._triangle) {
            this._triangle = this.triangle().normalized();
        }
        return this._triangle!;
    }

    static get Diamond(): RoundedPolygon {
        if (!this._diamond) {
            this._diamond = this.diamond().normalized();
        }
        return this._diamond!;
    }

    static get ClamShell(): RoundedPolygon {
        if (!this._clamShell) {
            this._clamShell = this.clamShell().normalized();
        }
        return this._clamShell!;
    }

    static get Pentagon(): RoundedPolygon {
        if (!this._pentagon) {
            this._pentagon = this.pentagon().normalized();
        }
        return this._pentagon!;
    }

    static get Gem(): RoundedPolygon {
        if (!this._gem) {
            this._gem = this.gem().normalized();
        }
        return this._gem!;
    }

    static get Sunny(): RoundedPolygon {
        if (!this._sunny) {
            this._sunny = this.sunny().normalized();
        }
        return this._sunny!;
    }

    /*
    static get VerySunny(): RoundedPolygon {
        if (!this._verySunny) {
            this._verySunny = this.verySunny().normalized();
        }
        return this._verySunny!;
    }
    */

    /*
    static get Cookie4Sided(): RoundedPolygon {
        if (!this._cookie4Sided) {
            this._cookie4Sided = this.cookie4().normalized();
        }
        return this._cookie4Sided!;
    }

    static get Cookie6Sided(): RoundedPolygon {
        if (!this._cookie6Sided) {
            this._cookie6Sided = this.cookie6().normalized();
        }
        return this._cookie6Sided!;
    }

    static get Cookie7Sided(): RoundedPolygon {
        if (!this._cookie7Sided) {
            this._cookie7Sided = this.cookie7().normalized();
        }
        return this._cookie7Sided!;
    }

    static get Cookie9Sided(): RoundedPolygon {
        if (!this._cookie9Sided) {
            this._cookie9Sided = this.cookie9().normalized();
        }
        return this._cookie9Sided!;
    }

    static get Cookie12Sided(): RoundedPolygon {
        if (!this._cookie12Sided) {
            this._cookie12Sided = this.cookie12().normalized();
        }
        return this._cookie12Sided!;
    }

    static get Ghostish(): RoundedPolygon {
        if (!this._ghostish) {
            this._ghostish = this.ghostish().normalized();
        }
        return this._ghostish!;
    }

    static get Clover4Leaf(): RoundedPolygon {
        if (!this._clover4Leaf) {
            this._clover4Leaf = this.clover4().normalized();
        }
        return this._clover4Leaf!;
    }

    static get Clover8Leaf(): RoundedPolygon {
        if (!this._clover8Leaf) {
            this._clover8Leaf = this.clover8().normalized();
        }
        return this._clover8Leaf!;
    }

    static get Burst(): RoundedPolygon {
        if (!this._burst) {
            this._burst = this.burst().normalized();
        }
        return this._burst!;
    }

    static get SoftBurst(): RoundedPolygon {
        if (!this._softBurst) {
            this._softBurst = this.softBurst().normalized();
        }
        return this._softBurst!;
    }

    static get Boom(): RoundedPolygon {
        if (!this._boom) {
            this._boom = this.boom().normalized();
        }
        return this._boom!;
    }

    static get SoftBoom(): RoundedPolygon {
        if (!this._softBoom) {
            this._softBoom = this.softBoom().normalized();
        }
        return this._softBoom!;
    }

    static get Flower(): RoundedPolygon {
        if (!this._flower) {
            this._flower = this.flower().normalized();
        }
        return this._flower!;
    }

    static get Puffy(): RoundedPolygon {
        if (!this._puffy) {
            this._puffy = this.puffy().normalized();
        }
        return this._puffy!;
    }

    static get PuffyDiamond(): RoundedPolygon {
        if (!this._puffyDiamond) {
            this._puffyDiamond = this.puffyDiamond().normalized();
        }
        return this._puffyDiamond!;
    }

    static get PixelCircle(): RoundedPolygon {
        if (!this._pixelCircle) {
            this._pixelCircle = this.pixelCircle().normalized();
        }
        return this._pixelCircle!;
    }

    static get PixelTriangle(): RoundedPolygon {
        if (!this._pixelTriangle) {
            this._pixelTriangle = this.pixelTriangle().normalized();
        }
        return this._pixelTriangle!;
    }

    static get Bun(): RoundedPolygon {
        if (!this._bun) {
            this._bun = this.bun().normalized();
        }
        return this._bun!;
    }

    static get Heart(): RoundedPolygon {
        if (!this._heart) {
            this._heart = this.heart().normalized();
        }
        return this._heart!;
    }
    */

    private static square(): RoundedPolygon {
        return Shapes.rectangle(1, 1, this.cornerRound30);
    }

    private static slanted(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(0.926, 0.970), new CornerRounding(0.189, 0.811)),
                new PointNRound(new Offset(-0.021, 0.967), new CornerRounding(0.187, 0.057)),
            ],
            2
        );
    }

    private static arch(): RoundedPolygon {
        return RoundedPolygon.create(
            4,
            undefined,
            undefined,
            undefined,
            [this.cornerRound100, this.cornerRound100, this.cornerRound20, this.cornerRound20],
        ).transformed(this.rotateNeg135);
    }

    private static fan(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(1.004, 1.000), new CornerRounding(0.148, 0.417)),
                new PointNRound(new Offset(0.000, 1.000), new CornerRounding(0.151)),
                new PointNRound(new Offset(0.000, -0.003), new CornerRounding(0.148)),
                new PointNRound(new Offset(0.978, 0.020), new CornerRounding(0.803)),
            ],
            1
        );
    }

    private static arrow(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(0.500, 0.892), new CornerRounding(0.313)),
                new PointNRound(new Offset(-0.216, 1.050), new CornerRounding(0.207)),
                new PointNRound(new Offset(0.499, -0.160), new CornerRounding(0.215, 1.000)),
                new PointNRound(new Offset(1.225, 1.060), new CornerRounding(0.211)),
            ],
            1
        );
    }

    private static semiCircle(): RoundedPolygon {
        return Shapes.rectangle(
            1.6,
            1,
            undefined,
            [this.cornerRound20, this.cornerRound20, this.cornerRound100, this.cornerRound100],
        );
    }

    private static oval(): RoundedPolygon {
        const m = new Matrix().scale(1, 0.64);
        return (Shapes.circle() as any).transformed(m).transformed(this.rotateNeg45);
    }

    private static pill(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(0.961, 0.039), new CornerRounding(0.426)),
                new PointNRound(new Offset(1.001, 0.428)),
                new PointNRound(new Offset(1.000, 0.609), new CornerRounding(1.000)),
            ],
            2,
            true
        );
    }

    private static triangle(): RoundedPolygon {
        return RoundedPolygon.create(3, undefined, undefined, undefined, this.cornerRound20).transformed(
            this.rotateNeg90
        );
    }

    private static diamond(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(0.500, 1.096), new CornerRounding(0.151, 0.524)),
                new PointNRound(new Offset(0.040, 0.500), new CornerRounding(0.159)),
            ],
            2
        );
    }

    private static clamShell(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(0.171, 0.841), new CornerRounding(0.159)),
                new PointNRound(new Offset(-0.020, 0.500), new CornerRounding(0.140)),
                new PointNRound(new Offset(0.170, 0.159), new CornerRounding(0.159)),
            ],
            2
        );
    }

    private static pentagon(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(0.500, -0.009), new CornerRounding(0.172)),
                new PointNRound(new Offset(1.030, 0.365), new CornerRounding(0.164)),
                new PointNRound(new Offset(0.828, 0.970), new CornerRounding(0.169)),
            ],
            1,
            true
        );
    }

    private static gem(): RoundedPolygon {
        return this.customPolygon(
            [
                new PointNRound(new Offset(0.499, 1.023), new CornerRounding(0.241, 0.778)),
                new PointNRound(new Offset(-0.005, 0.792), new CornerRounding(0.208)),
                new PointNRound(new Offset(0.073, 0.258), new CornerRounding(0.228)),
                new PointNRound(new Offset(0.433, -0.000), new CornerRounding(0.491)),
            ],
            1,
            true
        );
    }

    private static sunny(): RoundedPolygon {
        return Shapes.star(
            8,
            undefined,
            0.8,
            this.cornerRound15,
        );
    }

    /**
     * Creates a custom polygon by repeating and rotating a set of points.
     * @param pnr The points and rounding information for the base shape.
     * @param reps The number of times to repeat the shape.
     * @param mirroring Whether to mirror the shape on each repetition.
     * @param center The center of the polygon.
     */
    private static customPolygon(pnr: PointNRound[], reps: number, mirroring: boolean = false, center: Offset = new Offset(0.5, 0.5)): RoundedPolygon {
        const actualPoints = this.doRepeat(pnr, reps, center, mirroring);
        const vertices = actualPoints.flatMap(p => [p.o.x, p.o.y]);
        const perVertexRounding = actualPoints.map(p => p.r);
        return RoundedPolygon.createFromVertices(
            vertices,
            undefined,
            perVertexRounding,
            center.x,
            center.y
        );
    }

    private static doRepeat(points: PointNRound[], reps: number, center: Offset, mirroring: boolean): PointNRound[] {
        if (mirroring) {
            // This logic mirrors the shape on each repetition. It calculates the angles and
            // distances of the points from the center, and then uses them to create new points
            // for each repetition, alternating between the original and mirrored angles.
            const angles = points.map(p => Math.atan2(p.o.y - center.y, p.o.x - center.x));
            const distances = points.map(p => Math.sqrt(Math.pow(p.o.x - center.x, 2) + Math.pow(p.o.y - center.y, 2)));
            const actualReps = reps * 2;
            const sectionAngle = 2 * Math.PI / actualReps;
            const result: PointNRound[] = [];
            for (let i = 0; i < actualReps; i++) {
                points.forEach((p, index) => {
                    const j = i % 2 === 0 ? index : points.length - 1 - index;
                    if (j > 0 || i % 2 === 0) {
                        const a = sectionAngle * i + (i % 2 === 0 ? angles[j] : sectionAngle - angles[j] + 2 * angles[0]);
                        const finalPoint = new Offset(
                            Math.cos(a) * distances[j] + center.x,
                            Math.sin(a) * distances[j] + center.y
                        );
                        result.push(new PointNRound(finalPoint, points[j].r));
                    }
                });
            }
            return result;
        } else {
            return Array.from({ length: points.length * reps }, (_, i) => {
                const point = this.rotatePoint(points[i % points.length].o, (i / points.length) * 360 / reps, center);
                return new PointNRound(point, points[i % points.length].r);
            });
        }
    }

    private static rotatePoint(point: Offset, angle: number, center: Offset): Offset {
        const radians = angle * Math.PI / 180;
        const x = point.x - center.x;
        const y = point.y - center.y;
        return new Offset(
            x * Math.cos(radians) - y * Math.sin(radians) + center.x,
            x * Math.sin(radians) + y * Math.cos(radians) + center.y
        );
    }
}
