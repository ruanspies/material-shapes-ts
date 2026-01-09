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

import { Cubic } from './Cubic.js';
import { PointTransformer } from './Point.js';
import { DistanceEpsilon } from './Utils.js';

export abstract class Feature {
    constructor(public cubics: Cubic[]) {}

    abstract transformed(f: PointTransformer): Feature;
    abstract reversed(): Feature;
    abstract equals(other: Feature): boolean;
    abstract get isIgnorableFeature(): boolean;
    abstract get isEdge(): boolean;
    abstract get isConvexCorner(): boolean;
    abstract get isConcaveCorner(): boolean;

    static buildIgnorableFeature(cubics: Cubic[]): Feature {
        return Feature.validated(new Edge(cubics));
    }

    static buildEdge(cubic: Cubic): Feature {
        return new Edge([cubic]);
    }

    static buildConvexCorner(cubics: Cubic[]): Feature {
        return Feature.validated(new Corner(cubics, true));
    }

    static buildConcaveCorner(cubics: Cubic[]): Feature {
        return Feature.validated(new Corner(cubics, false));
    }

    private static validated(feature: Feature): Feature {
        if (feature.cubics.length === 0) {
            throw new Error("Features need at least one cubic.");
        }
        if (!Feature.isContinuous(feature)) {
            throw new Error(
                "Feature must be continuous, with the anchor points of all cubics " +
                "matching the anchor points of the preceding and succeeding cubics"
            );
        }
        return feature;
    }

    private static isContinuous(feature: Feature): boolean {
        let prevCubic = feature.cubics[0];
        for (let i = 1; i < feature.cubics.length; i++) {
            const cubic = feature.cubics[i];
            if (
                Math.abs(cubic.anchor0X - prevCubic.anchor1X) > DistanceEpsilon ||
                Math.abs(cubic.anchor0Y - prevCubic.anchor1Y) > DistanceEpsilon
            ) {
                return false;
            }
            prevCubic = cubic;
        }
        return true;
    }
}

export class Edge extends Feature {
    constructor(cubics: Cubic[]) {
        super(cubics);
    }

    transformed(f: PointTransformer): Edge {
        return new Edge(this.cubics.map(c => c.transformed(f)));
    }

    reversed(): Edge {
        return new Edge(this.cubics.map(c => c.reverse()).reverse());
    }

    equals(other: Feature): boolean {
        if (this === other) return true;
        if (!(other instanceof Edge)) return false;
        if (this.cubics.length !== other.cubics.length) return false;
        return this.cubics.every((c, i) => c.equals(other.cubics[i]));
    }

    get isIgnorableFeature(): boolean { return true; }
    get isEdge(): boolean { return true; }
    get isConvexCorner(): boolean { return false; }
    get isConcaveCorner(): boolean { return false; }

    toString(): string { return "Edge"; }
}

export class Corner extends Feature {
    constructor(cubics: Cubic[], public convex: boolean = true) {
        super(cubics);
    }

    transformed(f: PointTransformer): Corner {
        return new Corner(this.cubics.map(c => c.transformed(f)), this.convex);
    }

    reversed(): Corner {
        return new Corner(this.cubics.map(c => c.reverse()).reverse(), !this.convex);
    }

    equals(other: Feature): boolean {
        if (this === other) return true;
        if (!(other instanceof Corner)) return false;
        if (this.convex !== other.convex) return false;
        if (this.cubics.length !== other.cubics.length) return false;
        return this.cubics.every((c, i) => c.equals(other.cubics[i]));
    }

    get isIgnorableFeature(): boolean { return false; }
    get isEdge(): boolean { return false; }
    get isConvexCorner(): boolean { return this.convex; }
    get isConcaveCorner(): boolean { return !this.convex; }

    toString(): string {
        return `Corner: cubics=${this.cubics.map(c => `[${c}]`).join(", ")} convex=${this.convex}`;
    }
}
