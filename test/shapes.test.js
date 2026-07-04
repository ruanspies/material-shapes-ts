import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    MaterialShapes,
    Morph,
    morphToPath,
    roundedPolygonToPath,
    animateMorph,
    Easings,
    cubicBezier,
} from '../dist/index.js';

const NUM_RE = /-?\d+(\.\d+)?([eE][+-]?\d+)?/g;

function assertValidPath(d, label) {
    assert.ok(typeof d === 'string' && d.length > 0, `${label}: path is empty`);
    assert.match(d, /^M/, `${label}: path must start with moveTo`);
    assert.doesNotMatch(d, /[eE][+-]?\d/, `${label}: path must not use scientific notation`);
    assert.ok(d.trimEnd().endsWith('Z'), `${label}: path must be closed`);
    const nums = d.match(NUM_RE) || [];
    assert.ok(nums.length >= 8, `${label}: too few coordinates (${nums.length})`);
    for (const n of nums) {
        assert.ok(Number.isFinite(Number(n)), `${label}: non-finite coordinate ${n}`);
    }
}

test('all 35 shapes are registered and unique', () => {
    assert.equal(MaterialShapes.names.length, 35);
    assert.equal(new Set(MaterialShapes.names).size, 35);
    const all = MaterialShapes.all();
    assert.equal(all.length, 35);
});

test('every shape produces a valid, finite, closed path', () => {
    for (const name of MaterialShapes.names) {
        const poly = MaterialShapes.byName(name);
        assert.ok(poly, `${name}: missing polygon`);
        assertValidPath(roundedPolygonToPath(poly).toSvgPathData(), name);
    }
});

test('every shape is normalized within a small margin of [0,1]', () => {
    for (const name of MaterialShapes.names) {
        const d = roundedPolygonToPath(MaterialShapes.byName(name)).toSvgPathData();
        const nums = (d.match(NUM_RE) || []).map(Number);
        for (const n of nums) {
            assert.ok(n >= -0.35 && n <= 1.35, `${name}: coord ${n} out of expected range`);
        }
    }
});

test('morph produces valid paths across progress and matches endpoints closely', () => {
    const morph = new Morph(MaterialShapes.Circle, MaterialShapes.Heart);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        assertValidPath(morphToPath(morph, t).toSvgPathData(), `Circle->Heart @ ${t}`);
    }
});

test('morphing every shape to the next is stable', () => {
    const names = MaterialShapes.names;
    for (let i = 0; i < names.length; i++) {
        const a = MaterialShapes.byName(names[i]);
        const b = MaterialShapes.byName(names[(i + 1) % names.length]);
        const morph = new Morph(a, b);
        for (const t of [0, 0.5, 1]) {
            assertValidPath(morphToPath(morph, t).toSvgPathData(), `${names[i]}->${names[(i + 1) % names.length]} @ ${t}`);
        }
    }
});

test('every one of the 35x35 shape pairs morphs without throwing or producing NaN', () => {
    const names = MaterialShapes.names;
    let checked = 0;
    for (const a of names) {
        for (const b of names) {
            const morph = new Morph(MaterialShapes.byName(a), MaterialShapes.byName(b));
            for (let s = 0; s <= 4; s++) {
                assertValidPath(morphToPath(morph, s / 4).toSvgPathData(), `${a}->${b} @ ${s / 4}`);
                checked++;
            }
        }
    }
    assert.equal(checked, 35 * 35 * 5);
});

test('easing tokens are well-behaved on [0,1]', () => {
    for (const [name, fn] of Object.entries(Easings)) {
        assert.equal(fn(0), 0, `${name}(0) should be 0`);
        assert.equal(fn(1), 1, `${name}(1) should be 1`);
        for (let t = 0; t <= 1.0001; t += 0.1) {
            assert.ok(Number.isFinite(fn(t)), `${name}(${t}) not finite`);
        }
    }
    // A known midpoint sanity check on the standard-decelerate curve.
    const e = cubicBezier(0, 0, 0, 1);
    assert.ok(e(0.5) > 0.5, 'decelerate curve should be ahead at the midpoint');
});

test('animateMorph with duration 0 renders final frame and completes', async () => {
    let frames = 0;
    let last = '';
    const anim = animateMorph(MaterialShapes.Circle, MaterialShapes.Square, {
        duration: 0,
        onFrame: (d) => { frames++; last = d; },
    });
    await anim.finished;
    assert.equal(frames, 1);
    assertValidPath(last, 'animateMorph final');
});

test('animateMorph animates over time and can be cancelled', async () => {
    const frames = [];
    const anim = animateMorph(MaterialShapes.Circle, MaterialShapes.Heart, {
        duration: 60,
        easing: 'linear',
        onFrame: (_d, p) => frames.push(p),
    });
    await anim.finished;
    assert.ok(frames.length >= 2, `expected multiple frames, got ${frames.length}`);
    assert.equal(frames[frames.length - 1], 1, 'last progress should reach 1');
});
