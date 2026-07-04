# material-shapes-ts

All **35 Material Design shapes** for the web, plus smooth **morphing** between any
two of them. A faithful TypeScript port of the AndroidX
[Graphics Shapes](https://developer.android.com/jetpack/androidx/releases/graphics)
library and Compose
[MaterialShapes](https://developer.android.com/reference/kotlin/androidx/compose/material3/MaterialShapes).

Every shape is a rounded polygon rendered to plain **SVG path data**, so it drops
straight into a `<path d>`, a CSS `clip-path: path()`, or a canvas `Path2D` — in any
framework or none. Optional Vue 3 bindings ship separately.

- **Zero runtime dependencies** in the core.
- **35 shapes** — Circle, Square, Slanted, Arch, Semicircle, Oval, Pill, Triangle,
  Arrow, Fan, Diamond, Clamshell, Pentagon, Gem, Very sunny, Sunny, 4/6/7/9/12-sided
  cookie, 4/8-leaf clover, Burst, Soft burst, Boom, Soft boom, Flower, Puffy, Puffy
  diamond, Ghost-ish, Pixel circle, Pixel triangle, Bun, Heart.
- **Morphing** with corner-aware matching (convex↔convex), plus a batteries-included
  `animateMorph()` using Material 3 easing.

## Install

```bash
npm install material-shapes-ts
# pnpm add material-shapes-ts   /   yarn add material-shapes-ts
```

## Quick start — a shape as SVG

```ts
import { MaterialShapes, roundedPolygonToPath } from 'material-shapes-ts';

const d = roundedPolygonToPath(MaterialShapes.Heart).toSvgPathData();

// Coordinates live in a normalized 0..1 box, so a unit viewBox renders natively:
// <svg viewBox="0 0 1 1"><path d="…" /></svg>
pathEl.setAttribute('d', d);

// Or clip any element to the shape:
box.style.clipPath = `path('${d}')`;
```

## Accessing shapes

Each shape is a lazily-computed, cached `RoundedPolygon`:

```ts
MaterialShapes.Circle;        // RoundedPolygon
MaterialShapes.Cookie7Sided;
MaterialShapes.Heart;

MaterialShapes.names;                 // readonly ['Circle', 'Square', …] (35, in chart order)
MaterialShapes.byName('Heart');       // lookup by name
MaterialShapes.all();                 // [{ name, polygon }, …] — handy for galleries
```

## Morphing between shapes

A `Morph` matches the corners of two shapes and interpolates between them. Sample a
frozen frame at any progress `0..1`:

```ts
import { MaterialShapes, Morph, morphToPath } from 'material-shapes-ts';

const morph = new Morph(MaterialShapes.Circle, MaterialShapes.Heart);
const halfway = morphToPath(morph, 0.5).toSvgPathData();
```

### Animating

`animateMorph()` builds the morph once and drives it with `requestAnimationFrame`,
handing you an SVG path string each frame:

```ts
import { MaterialShapes, animateMorph } from 'material-shapes-ts';

const anim = animateMorph(MaterialShapes.Circle, MaterialShapes.Heart, {
  duration: 400,           // ms (default 400)
  easing: 'emphasized',    // a Material token name or your own (t) => number
  onFrame: (d) => pathEl.setAttribute('d', d),
  onComplete: () => {},
});

anim.cancel();             // stop early
await anim.finished;       // resolves when done (or cancelled)
```

Material 3 easing tokens are exported as `Easings`
(`linear`, `standard`, `standardAccelerate`, `standardDecelerate`, `emphasized`,
`emphasizedAccelerate`, `emphasizedDecelerate`), and `cubicBezier(x1,y1,x2,y2)` builds
your own.

## Vue 3

Bindings live in the `material-shapes-ts/vue` subpath (`vue` is an optional peer
dependency, never bundled into the core):

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MaterialShape, ShapeMorph, useMorph } from 'material-shapes-ts/vue';

const t = ref(0); // bind to a slider
const heartPath = useMorph('Circle', 'Heart', t); // reactive path string
</script>

<template>
  <!-- static shape -->
  <MaterialShape name="Heart" :size="120" color="deeppink" />

  <!-- declarative morph -->
  <ShapeMorph from="Circle" to="Heart" :progress="t" :size="120" />

  <!-- or drive the path yourself -->
  <svg viewBox="0 0 1 1"><path :d="heartPath" /></svg>
</template>
```

Also exported: `useShapePath(shape)`.

## Rendering recipes

```ts
const d = roundedPolygonToPath(MaterialShapes.Pill).toSvgPathData();

// 1. Inline SVG — <svg viewBox="0 0 1 1">
svg.innerHTML = `<path d="${d}" fill="currentColor" />`;

// 2. Clip an image / element (CSS)
img.style.clipPath = `path('${d}')`;

// 3. Canvas
const p = new Path2D(d);
ctx.save(); ctx.scale(size, size); ctx.fill(p); ctx.restore();
```

## Demo

An interactive gallery + morph playground lives in [`demo/`](./demo). Build a
self-contained page with:

```bash
npm run build          # compile the library
npm run build:demo     # inline it into demo/index.html
```

Then open `demo/index.html`.

## Development

```bash
npm run build   # tsc → dist/
npm test        # node:test — validates all 35 shapes + all 35×35 morph pairs
```

## Credits & license

Ported from the Android Open Source Project's `androidx.graphics.shapes` and
`androidx.compose.material3.MaterialShapes`. Licensed under **Apache-2.0**.
