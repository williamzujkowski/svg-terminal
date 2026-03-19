/**
 * SVG visual effects — filters, patterns, and defs for terminal appearance.
 */

import type { EffectsConfig } from '../types.js';
import { GLOW_BLUR_VALUES, SCANLINE_PARAMS, SHADOW_PARAMS } from './defaults.js';

/** Generate SVG pattern definitions (scanlines). */
export function generateDefs(effects: EffectsConfig): string {
  const parts: string[] = [];

  if (effects.scanlines) {
    parts.push(`
    <pattern id="scanlines" patternUnits="userSpaceOnUse" width="1" height="${SCANLINE_PARAMS.height}">
      <rect width="1" height="1" fill="transparent"/>
      <rect y="1" width="1" height="1" fill="rgba(255,255,255,${SCANLINE_PARAMS.opacity})"/>
    </pattern>`);
  }

  return parts.join('\n');
}

/** Parse hex color to normalized RGB (0-1 range). */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

/** Generate SVG filter definitions. */
export function generateFilters(effects: EffectsConfig, glowColor?: string): string {
  const parts: string[] = [];

  if (effects.textGlow) {
    const [core, medium, outer] = GLOW_BLUR_VALUES;
    // Derive glow color from theme cursor/foreground instead of hardcoded green
    const { r, g, b } = hexToRgb(glowColor ?? '#00ff41');
    parts.push(`
    <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${core}" result="coreBlur"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="${medium}" result="mediumBlur"/>
      <feColorMatrix in="mediumBlur" type="matrix" result="themeGlow"
        values="0 0 0 0 ${r.toFixed(2)}
                0 0 0 0 ${g.toFixed(2)}
                0 0 0 0 ${b.toFixed(2)}
                0 0 0 0.8 0"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="${outer}" result="outerBlur"/>
      <feBlend in="coreBlur" in2="themeGlow" mode="screen" result="layer12"/>
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
