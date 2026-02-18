/**
 * SVG visual effects — filters, patterns, and defs for terminal appearance.
 */

import type { EffectsConfig } from '../types.js';

/** Generate SVG pattern definitions (scanlines). */
export function generateDefs(effects: EffectsConfig): string {
  const parts: string[] = [];

  if (effects.scanlines) {
    parts.push(`
    <pattern id="scanlines" patternUnits="userSpaceOnUse" width="1" height="2">
      <rect width="1" height="1" fill="transparent"/>
      <rect y="1" width="1" height="1" fill="rgba(255,255,255,0.02)"/>
    </pattern>`);
  }

  return parts.join('\n');
}

/** Generate SVG filter definitions. */
export function generateFilters(effects: EffectsConfig): string {
  const parts: string[] = [];

  if (effects.textGlow) {
    parts.push(`
    <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.2" result="coreBlur"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="mediumBlur"/>
      <feColorMatrix in="mediumBlur" type="matrix" result="greenGlow"
        values="0 0 0 0 0
                0 1 0 0 0.3
                0 0 0 0 0
                0 0 0 1 0"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="outerBlur"/>
      <feBlend in="coreBlur" in2="greenGlow" mode="screen" result="layer12"/>
      <feBlend in="layer12" in2="outerBlur" mode="screen" result="allLayers"/>
      <feMerge>
        <feMergeNode in="allLayers"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`);
  }

  if (effects.shadow) {
    parts.push(`
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="15"/>
      <feOffset dx="0" dy="15" result="offsetblur"/>
      <feFlood flood-color="#000000" flood-opacity="0.8"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`);
  }

  return parts.join('\n');
}
