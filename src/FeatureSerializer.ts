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
import { Feature, Corner, Edge } from './Features.js';
import { debugLog } from './Utils.js';
import { DoubleMapper } from './DoubleMapper.js';

const LOG_TAG = "FeatureSerializer";
const SEPARATOR = ',';
const CONVEX_CORNER_CHAR = 'x';
const CONCAVE_CORNER_CHAR = 'o';
const EDGE_CHAR = 'n';
const FEATURE_TAG_ARRAY = [EDGE_CHAR, CONVEX_CORNER_CHAR, CONCAVE_CORNER_CHAR];

export class FeatureSerializer {
    static serialize(features: Feature[]): string {
        return "V1" + features.map(FeatureSerializer.serializeFeature).join("");
    }

    static parse(serializedFeatures: string): Feature[] {
        const versionMatch = /^\s*V(\d+)/.exec(serializedFeatures);
        let tagsSearchStart = 0;

        if (!versionMatch || versionMatch.length < 2) {
            debugLog(LOG_TAG, () =>
                "Could not find any version attached to the start of the input. Will default to V1 parsing."
            );
        } else {
            if (versionMatch[1] !== "1") {
                debugLog(LOG_TAG, () =>
                    `Found an unsupported version number ${versionMatch[1]}. Will default to version 1 parsing. Please update your library version to the latest version to fix this issue.`
                );
            }
            tagsSearchStart = versionMatch[0].length;
        }

        const tagsRegex = /[a-zA-Z]/g;
        tagsRegex.lastIndex = tagsSearchStart;
        const tags = tagsRegex.exec(serializedFeatures);
        if (!tags) {
            throw new Error(
                `Could not find any feature tags. Please mark all cubic bezier curve points belonging to a feature with one of {${FEATURE_TAG_ARRAY.join(", ")}} for V1, e.g. 'n1,1,2,2,3,3,4,4' for an edge (n) with anchor 0 (1,1), control 0 (2,2), control 1 (3,3) and anchor 1 (4,4).`
            );
        }

        const features: Feature[] = [];
        let currentMatch: RegExpExecArray | null = tags;
        while (currentMatch) {
            const featureStart = currentMatch.index;
            const nextMatch = tagsRegex.exec(serializedFeatures);
            const featureEnd = nextMatch ? nextMatch.index : serializedFeatures.length;
            features.push(FeatureSerializer.parseFeature(
                serializedFeatures, featureStart, featureEnd));
            currentMatch = nextMatch;
        }
        return features;
    }

    private static serializeFeature(feature: Feature): string {
        if (feature instanceof Edge) {
            return EDGE_CHAR + this.serializeCubics(feature.cubics);
        } else if (feature instanceof Corner) {
            const convexFlag = feature.convex ? CONVEX_CORNER_CHAR : CONCAVE_CORNER_CHAR;
            return convexFlag + this.serializeCubics(feature.cubics);
        } else {
            debugLog(LOG_TAG, () =>
                "Serializing a Feature unknown to V1 (knows Edge and Corner). Will default to parse as an edge. Please update the library to the latest version to fix this issue."
            );
            return EDGE_CHAR + this.serializeCubics(feature.cubics);
        }
    }

    private static serializeCubics(cubics: Cubic[]): string {
        let result = "";
        for (const cubic of cubics) {
            result += cubic.points
                .slice(0, 6)
                .map(p => this.removeTrailingZeroes(p.toString()))
                .join(SEPARATOR) + SEPARATOR;
        }
        const last = cubics[cubics.length - 1];
        result += `${this.removeTrailingZeroes(last.anchor1X.toString())}${SEPARATOR}${this.removeTrailingZeroes(last.anchor1Y.toString())}`;
        return result;
    }

    private static parseFeature(
        serialized: string,
        startIndex: number,
        endIndex: number
    ): Feature {
        const type = serialized[startIndex];
        const cubics = this.parseCubics(serialized, startIndex + 1, endIndex);
        switch (type) {
            case EDGE_CHAR:
                return new Edge(cubics);
            case CONVEX_CORNER_CHAR:
                return new Corner(cubics, true);
            case CONCAVE_CORNER_CHAR:
                return new Corner(cubics, false);
            default:
                debugLog(LOG_TAG, () =>
                    `Found an unknown Feature tag for V1 parsing. Given: ${type}, supported: {${FEATURE_TAG_ARRAY.join(", ")}}. Will default to Edge. Use a V1 supported tag or update the library to the latest version to fix this issue.`
                );
                return new Edge(cubics);
        }
    }

    private static parseCubics(
        serialized: string,
        startIndex: number,
        endIndex: number
    ): Cubic[] {
        const pointsStr = serialized.substring(startIndex, endIndex);
        const points = pointsStr.split(SEPARATOR).map(s => parseFloat(s.trim()));
        if (points.some(isNaN)) {
            throw new Error("Invalid number format in serialized feature.");
        }
        if ((points.length - 8) % 6 !== 0 && points.length !== 8) {
            throw new Error(`Invalid number of points in serialized feature: ${points.length}`);
        }

        const cubics: Cubic[] = [];
        for (let i = 0; i <= points.length - 8; i += 6) {
            const cubicPoints = points.slice(i, i + 8);
            cubics.push(new Cubic(cubicPoints));
        }
        return cubics;
    }

    private static removeTrailingZeroes(s: string): string {
        return s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
    }
}
