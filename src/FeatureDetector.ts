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
import { collinearIsh, RelaxedDistanceEpsilon } from './Utils.js';

export function detectFeatures(cubics: Cubic[]): Feature[] {
    if (cubics.length === 0) return [];

    const features: Feature[] = [];
    let current = cubics[0];

    for (let i = 0; i < cubics.length; i++) {
        const next = cubics[(i + 1) % cubics.length];

        if (i < cubics.length - 1 && alignsIshWith(current, next)) {
            current = Cubic.extend(current, next);
            continue;
        }

        features.push(asFeature(current, next));

        if (!smoothesIntoIsh(current, next)) {
            features.push(asFeature(Cubic.empty(current.anchor1X, current.anchor1Y), next));
        }

        current = next;
    }
    return features;
}

function asFeature(cubic: Cubic, next: Cubic): Feature {
    return straightIsh(cubic)
        ? new Edge([cubic])
        : new Corner([cubic], cubic.convexTo(next));
}

function straightIsh(cubic: Cubic): boolean {
    return !cubic.zeroLength() &&
        collinearIsh(
            cubic.anchor0X, cubic.anchor0Y,
            cubic.anchor1X, cubic.anchor1Y,
            cubic.control0X, cubic.control0Y,
            RelaxedDistanceEpsilon
        ) &&
        collinearIsh(
            cubic.anchor0X, cubic.anchor0Y,
            cubic.anchor1X, cubic.anchor1Y,
            cubic.control1X, cubic.control1Y,
            RelaxedDistanceEpsilon
        );
}

function smoothesIntoIsh(cubic: Cubic, next: Cubic): boolean {
    return collinearIsh(
        cubic.control1X, cubic.control1Y,
        next.control0X, next.control0Y,
        cubic.anchor1X, cubic.anchor1Y,
        RelaxedDistanceEpsilon
    );
}

function alignsIshWith(cubic: Cubic, next: Cubic): boolean {
    return (straightIsh(cubic) && straightIsh(next) && smoothesIntoIsh(cubic, next)) ||
        cubic.zeroLength() ||
        next.zeroLength();
}
