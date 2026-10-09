---
title: "Mathematical Visualizations"
permalink: /visualizations/
author_profile: true
excerpt: "Interactive mathematical explorations inspired by Desmos and visual classroom practice."
---

<p class="page-intro">I enjoy using visual tools—especially Desmos—to make structure visible, invite conjectures, and give students more than one way into an idea. This section is a home for interactive classroom prompts and mathematical explorations.</p>

<section class="visual-lab" data-unit-circle>
  <div class="visual-lab__controls">
    <p class="eyebrow">Interactive warm-up</p>
    <h2>Move around the unit circle</h2>
    <p>This prototype grows from a recurring MATH 1499 attendance prompt: completing one piece of the unit circle at a time.</p>
    <label for="angle-step">Angle: <output for="angle-step" data-angle>π/6</output></label>
    <input id="angle-step" data-angle-input type="range" min="0" max="12" step="1" value="1" aria-describedby="unit-circle-readout">
    <p class="visual-lab__readout" id="unit-circle-readout" aria-live="polite" data-coordinate>At π/6, the point is (√3/2, 1/2).</p>
  </div>
  <svg class="unit-circle" viewBox="0 0 360 360" role="img" aria-labelledby="unit-circle-title unit-circle-desc">
    <title id="unit-circle-title">Interactive unit circle</title>
    <desc id="unit-circle-desc">A point and radius move around a coordinate circle as the angle slider changes.</desc>
    <g class="unit-circle__grid">
      <path d="M40 90H320M40 135H320M40 180H320M40 225H320M40 270H320"/>
      <path d="M90 40V320M135 40V320M180 40V320M225 40V320M270 40V320"/>
    </g>
    <path class="unit-circle__axis" d="M30 180H330M180 30V330"/>
    <circle class="unit-circle__ring" cx="180" cy="180" r="118"/>
    <line class="unit-circle__radius" x1="180" y1="180" x2="282.2" y2="121" data-radius/>
    <circle class="unit-circle__point" cx="282.2" cy="121" r="8" data-point/>
  </svg>
</section>

<noscript><p>The unit-circle control requires JavaScript. The initial diagram shows the point at \(\pi/6\).</p></noscript>
<script src="{{ '/assets/js/math-visuals.js' | relative_url }}" defer></script>
