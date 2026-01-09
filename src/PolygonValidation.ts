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

import { RoundedPolygon } from './RoundedPolygon.js';
import { debugLog } from './Utils.js';
import { Feature } from './Features.js';

const LOG_TAG = "PolygonValidation";

export class PolygonValidator {
    static fix(polygon: RoundedPolygon): RoundedPolygon {
        let result = polygon;

        debugLog(LOG_TAG, () => "Validating polygon...");

        if (PolygonValidator.isCWOriented(polygon)) {
            debugLog(LOG_TAG, () => "Passed clockwise validation!");
        } else {
            debugLog(LOG_TAG, () => "Polygon is oriented anti-clockwise, fixing orientation...");
            result = PolygonValidator.fixCWOrientation(polygon);
        }

        return result;
    }

    private static isCWOriented(polygon: RoundedPolygon): boolean {
        let signedArea = 0;
        for (const cubic of polygon.cubics) {
            signedArea += (cubic.anchor1X - cubic.anchor0X) * (cubic.anchor1Y + cubic.anchor0Y);
        }
        return signedArea < 0;
    }

    private static fixCWOrientation(polygon: RoundedPolygon): RoundedPolygon {
        const reversedFeatures = [
            polygon.features[0].reversed(),
            ...polygon.features.slice(1).reverse().map((f: Feature) => f.reversed())
        ];
        return RoundedPolygon.createFromFeatures(reversedFeatures, polygon.centerX, polygon.centerY);
    }
}
