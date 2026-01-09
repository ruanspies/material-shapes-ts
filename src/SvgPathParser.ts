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
import { Feature } from './Features.js';
import { RoundedPolygon } from './RoundedPolygon.js';
import { PolygonValidator } from './PolygonValidation.js';
import { ArcConverter } from './ArcConverter.js';
import { Point } from './Point.js';
import { debugLog, DistanceEpsilon } from './Utils.js';
import { detectFeatures } from './FeatureDetector.js';

const LOG_TAG = "SvgPathParser";

class Command {
    constructor(
        public letter: string,
        public isRelative: boolean,
        public parameters: number[],
        public paramsCount: number,
        public start: Point = new Point(0, 0)
    ) {}

    static readonly commandToParamsCount: { [key: string]: number } = {
        m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7
    };

    static parse(input: string, currentPosition: Point): Command {
        const letter = input[0];
        const isRelative = letter.toLowerCase() === letter;
        const parameters = input
            .substring(1)
            .split(/[\s,]+/)
            .filter(s => s.length > 0)
            .map(s => parseFloat(s.trim()));
        return new Command(
            letter.toLowerCase(),
            isRelative,
            parameters,
            Command.commandToParamsCount[letter.toLowerCase()] || 0,
            isRelative ? currentPosition : new Point(0, 0)
        );
    }

    get isLineCommand(): boolean { return ['l', 'h', 'v'].includes(this.letter); }
    get isBezierCommand(): boolean { return ['c', 's'].includes(this.letter); }
    get isQuadraticCurveCommand(): boolean { return ['q', 't'].includes(this.letter); }
    get isCurveCommand(): boolean {
        return this.isBezierCommand || this.isQuadraticCurveCommand;
    }
    get isArcCommand(): boolean { return this.letter === 'a'; }
    get isCloseCommand(): boolean { return this.letter === 'z'; }

    get(i: number): number { return this.parameters[i]; }

    x(i: number): number {
        const coordinate = this.get(i);
        return this.isRelative ? this.start.x + coordinate : coordinate;
    }

    y(i: number): number {
        const coordinate = this.get(i);
        return this.isRelative ? this.start.y + coordinate : coordinate;
    }

    xy(i: number, j: number): Point {
        const coordinates = new Point(this.get(i), this.get(j));
        return this.isRelative ? this.start.plus(coordinates) : coordinates;
    }

    chunk(index: number, currentPosition: Point): Command {
        return new Command(
            this.letter,
            this.isRelative,
            this.parameters.slice(index, index + this.paramsCount),
            this.paramsCount,
            currentPosition
        );
    }

    asLine(newStart: Point): Command {
        const convertedParameters = this.parameters.slice(this.paramsCount);
        return new Command('l', this.isRelative, convertedParameters, 2, newStart);
    }
}


export class SvgPathParser {
    private cubics: Cubic[] = [];
    private position: Point;
    private previousCommand: Command = new Command('I', false, [], 0);

    private constructor(startPosition: Point) {
        this.position = startPosition;
    }

    private get reflectedPreviousControlPoint(): Point {
        const lastCubic = this.cubics[this.cubics.length - 1];
        const lastControl = new Point(lastCubic.control1X, lastCubic.control1Y);
        return this.position.plus(this.position.minus(lastControl));
    }

    static parseFeatures(svgPath: string): Feature[] {
        const parsedCubics = SvgPathParser.parseCubics(svgPath);
        const continuous = (first: Cubic, second: Cubic) =>
            Math.abs(second.anchor0X - first.anchor1X) < DistanceEpsilon &&
            Math.abs(second.anchor0Y - first.anchor1Y) < DistanceEpsilon;

        let continuousCubicsCount = parsedCubics.length;
        for (let i = 0; i < parsedCubics.length - 1; i++) {
            if (!continuous(parsedCubics[i], parsedCubics[i + 1])) {
                continuousCubicsCount = i + 1;
                break;
            }
        }
        const firstShapeCubics = parsedCubics.slice(0, continuousCubicsCount);
        const features = detectFeatures(firstShapeCubics);
        if (features.length === 0) {
            return [];
        }
        const parsedPolygon = RoundedPolygon.createFromFeatures(features);
        return PolygonValidator.fix(parsedPolygon).features;
    }

    static parseCubics(svgPath: string): Cubic[] {
        const paths = svgPath.split(/(?=[mM])/).filter(s => s.trim().length > 0);
        let current = new Point(0, 0);
        const allCubics: Cubic[] = [];

        paths.forEach(path => {
            const commandStrings = path.split(/(?=[a-zA-Z])/).filter(s => s.trim().length > 0);
            const moveToCommand = Command.parse(commandStrings[0], current);
            current = moveToCommand.start.plus(
                new Point(moveToCommand.get(0), moveToCommand.get(1))
            );

            const parser = new SvgPathParser(current);
            parser.parseCommand(moveToCommand.asLine(current));
            commandStrings.slice(1).forEach(cmdStr =>
                parser.parseCommand(Command.parse(cmdStr, parser.position))
            );
            allCubics.push(...parser.cubics);
        });
        return allCubics;
    }

    private parseCommand(command: Command) {
        if (command.isCloseCommand) {
            this.cubics.push(this.lineToCubic(this.position, new Point(this.cubics[0].anchor0X, this.cubics[0].anchor0Y)));
            return;
        }

        for (let i = 0; i < command.parameters.length; i += command.paramsCount) {
            const atomicCommand = command.chunk(i, this.position);
            this.parseAtomicCommand(atomicCommand);
        }
    }

    private parseAtomicCommand(atomicCommand: Command) {
        if (atomicCommand.isLineCommand) {
            this.parseLine(atomicCommand);
        } else if (atomicCommand.isCurveCommand) {
            this.parseCurve(atomicCommand);
        } else if (atomicCommand.isArcCommand) {
            this.parseArc(atomicCommand);
        } else {
            debugLog(LOG_TAG, () => `Ignoring unknown command: ${atomicCommand.letter}`);
        }
        this.previousCommand = atomicCommand;
    }

    private parseLine(command: Command) {
        const addLineTo = (endPoint: Point) => {
            this.cubics.push(this.lineToCubic(this.position, endPoint));
            this.position = endPoint;
        };
        switch (command.letter) {
            case 'l': addLineTo(command.xy(0, 1)); break;
            case 'h': addLineTo(new Point(command.x(0), this.position.y)); break;
            case 'v': addLineTo(new Point(this.position.x, command.y(0))); break;
        }
    }

    private parseCurve(command: Command) {
        const addCurveWith = (c0: Point, c1: Point, a1: Point) => {
            this.cubics.push(new Cubic([
                this.position.x, this.position.y,
                c0.x, c0.y, c1.x, c1.y, a1.x, a1.y
            ]));
            this.position = a1;
        };
        switch (command.letter) {
            case 'c':
                addCurveWith(command.xy(0, 1), command.xy(2, 3), command.xy(4, 5));
                break;
            case 's': {
                const c0 = this.previousCommand.isBezierCommand
                    ? this.reflectedPreviousControlPoint
                    : this.position;
                addCurveWith(c0, command.xy(0, 1), command.xy(2, 3));
                break;
            }
            case 'q': {
                const qp0 = this.position;
                const qp1 = command.xy(0, 1);
                const qp2 = command.xy(2, 3);
                const cp1 = qp0.plus(qp1.minus(qp0).times(2/3));
                const cp2 = qp2.plus(qp1.minus(qp2).times(2/3));
                addCurveWith(cp1, cp2, qp2);
                break;
            }
            case 't': {
                const qp0 = this.position;
                const prevQp1 = this.previousCommand.isQuadraticCurveCommand
                    ? this.reflectedPreviousControlPoint
                    : qp0;
                const qp2 = command.xy(0, 1);
                const cp1 = qp0.plus(prevQp1.minus(qp0).times(2/3));
                const cp2 = qp2.plus(prevQp1.minus(qp2).times(2/3));
                addCurveWith(cp1, cp2, qp2);
                break;
            }
        }
    }

    private parseArc(command: Command) {
        const target = command.xy(5, 6);
        const arcCubics = ArcConverter.arcToCubics(
            this.position.x, this.position.y, target.x, target.y,
            command.get(0), command.get(1), command.get(2),
            command.get(3) !== 0, command.get(4) !== 0
        );
        this.cubics.push(...arcCubics);
        this.position = target;
    }

    private lineToCubic(start: Point, end: Point): Cubic {
        return Cubic.straightLine(start.x, start.y, end.x, end.y);
    }
}
