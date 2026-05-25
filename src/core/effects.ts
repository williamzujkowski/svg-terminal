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

  return parts.join('\n');
}

/** Generate SVG filter definitions. */
export function generateFilters(effects: EffectsConfig, _glowColor?: string): string {
  const parts: string[] = [];

  if (effects.textGlow) {
    // Two-pass blur of the SourceGraphic, then composite back over it.
    // SourceGraphic (not SourceAlpha) makes the halo inherit the text color —
    // green text glows green, magenta glows magenta. No theme recolor needed.
    parts.push(`
    <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="core"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="halo"/>
      <feMerge>
        <feMergeNode in="halo"/>
        <feMergeNode in="core"/>
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
