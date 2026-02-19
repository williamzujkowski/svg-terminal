/**
 * Weather block — fetches live weather data from wttr.in.
 * Displays current conditions in a styled terminal box.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { fetchJson } from '../core/http.js';

/** wttr.in JSON response shape (subset). */
interface WttrResponse {
  current_condition: Array<{
    temp_F: string;
    temp_C: string;
    FeelsLikeF: string;
    FeelsLikeC: string;
    humidity: string;
    weatherDesc: Array<{ value: string }>;
    windspeedMiles: string;
    windspeedKmph: string;
    winddir16Point: string;
    uvIndex: string;
  }>;
  nearest_area: Array<{
    areaName: Array<{ value: string }>;
    region: Array<{ value: string }>;
    country: Array<{ value: string }>;
  }>;
}

/** Format weather data into display lines. */
function formatWeather(
  data: WttrResponse,
  units: string,
  compact: boolean,
): string[] {
  const current = data.current_condition[0];
  const area = data.nearest_area?.[0];
  if (!current) return ['Weather data unavailable'];

  const desc = current.weatherDesc?.[0]?.value ?? 'Unknown';
  const locationName = area?.areaName?.[0]?.value ?? 'Unknown';
  const region = area?.region?.[0]?.value;
  const locationStr = region ? `${locationName}, ${region}` : locationName;

  const tempF = `${current.temp_F}°F`;
  const tempC = `${current.temp_C}°C`;
  const feelsF = `${current.FeelsLikeF}°F`;
  const feelsC = `${current.FeelsLikeC}°C`;

  const temp = units === 'imperial' ? tempF
    : units === 'metric' ? tempC
    : `${tempF} / ${tempC}`;

  const feels = units === 'imperial' ? feelsF
    : units === 'metric' ? feelsC
    : `${feelsF} / ${feelsC}`;

  const wind = units === 'metric'
    ? `${current.windspeedKmph} km/h ${current.winddir16Point}`
    : `${current.windspeedMiles} mph ${current.winddir16Point}`;

  if (compact) {
    return [
      `[[fg:cyan]]${locationStr}[[/fg]]`,
      `${desc}  ${temp}  Humidity: ${current.humidity}%`,
    ];
  }

  return [
    '',
    `[[fg:cyan]]WEATHER: ${locationStr}[[/fg]]`,
    `${desc}  [[bold]]${temp}[[/bold]]`,
    `Humidity: ${current.humidity}%   Wind: ${wind}`,
    `Feels Like: ${feels}   UV: ${current.uvIndex}`,
    '',
  ];
}

/** Weather block definition. */
export const weatherBlock: Block = {
  name: 'weather',
  description: 'Display current weather conditions from wttr.in',

  async render(context: BlockContext, config: Record<string, unknown>): Promise<BlockResult> {
    const location = (config['location'] as string) ?? '';
    const units = (config['units'] as string) ?? 'both';
    const compact = (config['compact'] as boolean) ?? false;
    const width = (config['width'] as number) ?? 58;
    const timeout = context.config.fetchTimeout;

    if (!location) {
      return {
        command: (config['command'] as string) ?? 'curl wttr.in',
        lines: ['[[fg:yellow]]Weather: no location configured[[/fg]]'],
        typing: 'fast',
        pause: 'short',
      };
    }

    // wttr.in hangs on %20 and misroutes ~ — underscores work reliably for spaces
    const encodedLocation = encodeURIComponent(location).replace(/%20/g, '_');
    const url = `https://wttr.in/${encodedLocation}?format=j1`;
    const data = await fetchJson<WttrResponse>(url, timeout);

    let lines: string[];
    if (data?.current_condition?.length) {
      lines = formatWeather(data, units, compact);
    } else {
      lines = [
        '',
        '[[fg:yellow]]Weather data unavailable[[/fg]]',
        `Location: ${location}`,
        '',
      ];
    }

    const box = compact ? undefined : createDoubleBox(lines, width);
    return {
      command: (config['command'] as string) ?? `curl wttr.in/${location}`,
      lines: box ? box.split('\n') : lines,
      typing: 'fast',
      pause: 'medium',
    };
  },
};

/**
 * Fetch a one-line weather summary for embedding in other blocks (e.g. MOTD).
 * Returns a formatted string or null if unavailable.
 */
export async function fetchWeatherSummary(
  location: string,
  units: string,
  timeout: number,
): Promise<string | null> {
  if (!location) return null;

  // wttr.in treats %20 and + inconsistently — use ~ for spaces (documented by wttr.in)
  const encodedLocation = encodeURIComponent(location).replace(/%20/g, '~');
  const url = `https://wttr.in/${encodedLocation}?format=j1`;
  const data = await fetchJson<WttrResponse>(url, timeout);

  if (!data?.current_condition?.length) return null;

  const current = data.current_condition[0]!;
  const desc = current.weatherDesc?.[0]?.value ?? '';
  const temp = units === 'metric'
    ? `${current.temp_C}°C`
    : units === 'imperial'
      ? `${current.temp_F}°F`
      : `${current.temp_F}°F/${current.temp_C}°C`;

  return `${desc} ${temp} | Humidity: ${current.humidity}%`;
}
