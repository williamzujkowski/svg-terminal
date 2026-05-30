/**
 * SVG visual effects — filters, patterns, and defs for terminal appearance.
 */

import type { EffectsConfig, WindowStyle } from '../types.js';
import { SCANLINE_PARAMS, SHADOW_PARAMS } from './defaults.js';

/** Generate SVG pattern + gradient definitions. */
export function generateDefs(effects: EffectsConfig, windowStyle?: WindowStyle): string {
  const parts: string[] = [];

  if (effects.scanlines) {
    parts.push(`
    <pattern id="scanlines" patternUnits="userSpaceOnUse" width="1" height="${SCANLINE_PARAMS.height}">
      <rect width="1" height="1" fill="transparent"/>
      <rect y="1" width="1" height="1" fill="rgba(255,255,255,${SCANLINE_PARAMS.opacity})"/>
    </pattern>`);
  }

  if (windowStyle === 'win95') {
    parts.push(`
    <linearGradient id="win95Caption" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000080"/>
      <stop offset="1" stop-color="#1084d0"/>
    </linearGradient>`);
  }

  if (effects.vignette) {
    // Center-hot CRT phosphor falloff. Transparent at center → ~25% black at
    // corners. cx/cy 50% and r 75% means the darkening starts ~halfway out
    // and peaks at the corners; subtle, not heavy-handed. Painted as an
    // overlay rect over the terminal content area (see renderVignetteOverlay
    // in svg-generator.ts).
    parts.push(`
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="60%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.25"/>
    </radialGradient>`);
  }

  return parts.join('\n');
}

/** Generate SVG filter definitions. */
export function generateFilters(effects: EffectsConfig, _glowColor?: string): string {
  const parts: string[] = [];

  if (effects.textGlow) {
    // A single colored halo behind RAZOR-SHARP text. The glyphs themselves are
    // never blurred — only a blurred copy sits BEHIND the unblurred
    // SourceGraphic (last feMergeNode = on top). The old filter also blurred a
    // "core" copy of the text (stdDeviation 0.6) and stacked it just under the
    // sharp layer, softening every glyph edge — that, plus a wide stdDeviation-2
    // halo, was the "glow makes it hard to read" complaint (#126). Now: one
    // tight halo (1.4), no core blur → phosphor aura + crisp glyphs. SourceGraphic
    // (not SourceAlpha) makes the halo inherit each token's color (green glows
    // green, magenta glows magenta).
    parts.push(`
    <filter id="textGlow" x="-12%" y="-12%" width="124%" height="124%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="halo"/>
      <feMerge>
        <feMergeNode in="halo"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`);
  }

  if (effects.shadow) {
    parts.push(`
    <filter id="shadow" x="-8%" y="-8%" width="116%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${SHADOW_PARAMS.blur}"/>
      <feOffset dx="0" dy="${SHADOW_PARAMS.dy}" result="offsetblur"/>
      <feFlood flood-color="#000000" flood-opacity="${SHADOW_PARAMS.opacity}"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`);
  }

  return parts.join('\n');
}
