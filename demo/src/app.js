(function () {
  var MaterialShapes = MS.MaterialShapes;
  var Morph = MS.Morph;
  var morphToPath = MS.morphToPath;
  var roundedPolygonToPath = MS.roundedPolygonToPath;
  var animateMorph = MS.animateMorph;
  var Easings = MS.Easings;

  var names = MaterialShapes.names;
  var LABELS = {
    Circle: 'Circle', Square: 'Square', Slanted: 'Slanted', Arch: 'Arch', SemiCircle: 'Semicircle',
    Oval: 'Oval', Pill: 'Pill', Triangle: 'Triangle', Arrow: 'Arrow', Fan: 'Fan',
    Diamond: 'Diamond', ClamShell: 'Clamshell', Pentagon: 'Pentagon', Gem: 'Gem', VerySunny: 'Very sunny',
    Sunny: 'Sunny', Cookie4Sided: '4-sided cookie', Cookie6Sided: '6-sided cookie', Cookie7Sided: '7-sided cookie',
    Cookie9Sided: '9-sided cookie', Cookie12Sided: '12-sided cookie', Clover4Leaf: '4-leaf clover',
    Clover8Leaf: '8-leaf clover', Burst: 'Burst', SoftBurst: 'Soft burst', Boom: 'Boom', SoftBoom: 'Soft boom',
    Flower: 'Flower', Puffy: 'Puffy', PuffyDiamond: 'Puffy diamond', Ghostish: 'Ghost-ish',
    PixelCircle: 'Pixel circle', PixelTriangle: 'Pixel triangle', Bun: 'Bun', Heart: 'Heart'
  };
  var label = function (n) { return LABELS[n] || n; };
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var pathFor = function (name) { return roundedPolygonToPath(MaterialShapes.byName(name)).toSvgPathData(); };

  // ---- State ----
  var state = { from: 'Circle', to: 'Heart', morph: null, anim: null };
  var rebuild = function () { state.morph = new Morph(MaterialShapes.byName(state.from), MaterialShapes.byName(state.to)); };

  // Shareable deep-links: #From~To~progress
  var writeHash = function () {
    try { history.replaceState(null, '', '#' + state.from + '~' + state.to + '~' + Math.round(Number(progress.value))); } catch (e) {}
  };
  var readHash = function () {
    var parts = decodeURIComponent((location.hash || '').slice(1)).split('~');
    if (parts.length >= 2 && LABELS[parts[0]] && LABELS[parts[1]]) { state.from = parts[0]; state.to = parts[1]; }
    var p = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
    return Math.max(0, Math.min(100, isNaN(p) ? 0 : p));
  };

  var stagePath = $('stagePath'), progress = $('progress'), pct = $('pct');
  var fromLabel = $('fromLabel'), toLabel = $('toLabel'), fromSel = $('fromSel'), toSel = $('toSel');

  var setFrame = function (p) {
    stagePath.setAttribute('d', morphToPath(state.morph, p).toSvgPathData());
    progress.value = String(Math.round(p * 100));
    pct.textContent = Math.round(p * 100) + '%';
  };
  var syncLabels = function () {
    fromLabel.textContent = label(state.from);
    toLabel.textContent = label(state.to);
    fromSel.value = state.from; toSel.value = state.to;
    updateRoles();
  };

  // ---- Selects ----
  var optionsHtml = names.map(function (n) { return '<option value="' + n + '">' + label(n) + '</option>'; }).join('');
  fromSel.innerHTML = optionsHtml; toSel.innerHTML = optionsHtml;
  var easingSel = $('easingSel');
  easingSel.innerHTML = Object.keys(Easings).map(function (k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
  easingSel.value = 'emphasized';

  var stop = function () { if (state.anim) { state.anim.cancel(); state.anim = null; } };

  var play = function () {
    stop();
    if (reduce) { rebuild(); setFrame(1); return; }
    state.anim = animateMorph(MaterialShapes.byName(state.from), MaterialShapes.byName(state.to), {
      duration: 720,
      easing: easingSel.value,
      onFrame: function (d, p) {
        stagePath.setAttribute('d', d);
        progress.value = String(Math.round(p * 100));
        pct.textContent = Math.round(p * 100) + '%';
      },
      onComplete: function () { state.anim = null; }
    });
  };

  fromSel.addEventListener('change', function () { stop(); state.from = fromSel.value; rebuild(); syncLabels(); setFrame(0); writeHash(); });
  toSel.addEventListener('change', function () { stop(); state.to = toSel.value; rebuild(); syncLabels(); setFrame(0); writeHash(); });
  progress.addEventListener('input', function () { stop(); setFrame(Number(progress.value) / 100); });
  progress.addEventListener('change', writeHash);
  $('playBtn').addEventListener('click', function () { play(); writeHash(); });
  $('swapBtn').addEventListener('click', function () {
    stop(); var f = state.from; state.from = state.to; state.to = f; rebuild(); syncLabels(); setFrame(0); writeHash();
  });

  // ---- Gallery ----
  var gallery = $('gallery');
  gallery.innerHTML = names.map(function (n) {
    return '<button class="card" data-name="' + n + '">' +
      '<span class="tag" data-tag="' + n + '"></span>' +
      '<svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="' + pathFor(n) + '"></path></svg>' +
      '<span class="name">' + label(n) + '</span></button>';
  }).join('');
  $('galleryCount').textContent = names.length + ' shapes';

  function updateRoles() {
    var cards = gallery.querySelectorAll('.card');
    cards.forEach(function (c) {
      var n = c.getAttribute('data-name');
      var tag = c.querySelector('.tag');
      if (n === state.from) { c.setAttribute('data-role', 'from'); tag.textContent = 'From'; }
      else if (n === state.to) { c.setAttribute('data-role', 'to'); tag.textContent = 'To'; }
      else { c.removeAttribute('data-role'); tag.textContent = ''; }
    });
  }
  gallery.addEventListener('click', function (e) {
    var card = e.target.closest('.card'); if (!card) return;
    var name = card.getAttribute('data-name');
    if (name === state.to) return;
    // Chain: morph from the current target into the tapped shape.
    state.from = state.to; state.to = name;
    rebuild(); syncLabels(); play(); writeHash();
    card.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  });

  // ---- Theme toggle ----
  var root = document.documentElement;
  $('themeToggle').addEventListener('click', function () {
    var isDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  });

  // ---- Usage tabs ----
  var SNIPPETS = {
    core:
      "import { MaterialShapes, roundedPolygonToPath } from 'material-shapes-ts';\n\n" +
      "// Any of the 35 shapes, as SVG path data in a 0..1 box\n" +
      "const d = roundedPolygonToPath(MaterialShapes.Heart).toSvgPathData();\n\n" +
      "pathEl.setAttribute('d', d);            // <path d=\"…\">\n" +
      "box.style.clipPath = `path('${d}')`;    // or clip any element",
    morph:
      "import { MaterialShapes, Morph, morphToPath, animateMorph } from 'material-shapes-ts';\n\n" +
      "// A frozen frame at 50% between two shapes\n" +
      "const morph = new Morph(MaterialShapes.Circle, MaterialShapes.Heart);\n" +
      "const half = morphToPath(morph, 0.5).toSvgPathData();\n\n" +
      "// …or let the library animate it for you\n" +
      "animateMorph(MaterialShapes.Circle, MaterialShapes.Heart, {\n" +
      "  duration: 400,\n" +
      "  easing: 'emphasized',\n" +
      "  onFrame: (d) => pathEl.setAttribute('d', d),\n" +
      "});",
    vue:
      "<script setup lang=\"ts\">\n" +
      "import { ref } from 'vue';\n" +
      "import { ShapeMorph } from 'material-shapes-ts/vue';\n\n" +
      "const t = ref(0); // bind this to a slider\n" +
      "</" + "script>\n\n" +
      "<template>\n" +
      "  <ShapeMorph from=\"Circle\" to=\"Heart\" :progress=\"t\" :size=\"120\" />\n" +
      "</template>"
  };
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hl(code) {
    return esc(code).split('\n').map(function (line) {
      var ci = line.indexOf('//');
      var head = line, tail = '';
      if (ci >= 0) { head = line.slice(0, ci); tail = '<span class="c">' + line.slice(ci) + '</span>'; }
      head = head
        .replace(/('[^']*'|"[^"]*")/g, '<span class="s">$1</span>')
        .replace(/\b(import|from|const|new|ref|setup)\b/g, '<span class="k">$1</span>');
      return head + tail;
    }).join('\n');
  }
  var codeBlock = $('codeBlock'), current = 'core';
  function showTab(t) {
    current = t;
    codeBlock.innerHTML = hl(SNIPPETS[t]);
    $('tabs').querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === t); });
  }
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) showTab(b.getAttribute('data-tab')); });
  $('copyBtn').addEventListener('click', function () {
    navigator.clipboard.writeText(SNIPPETS[current]).then(function () {
      var btn = $('copyBtn'); btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
    });
  });

  // ---- Init ----
  var initP = readHash();
  rebuild(); syncLabels(); setFrame(initP / 100); showTab('core'); writeHash();
})();
