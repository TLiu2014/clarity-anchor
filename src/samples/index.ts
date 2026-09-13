/**
 * Preset sample scenarios for the hackathon demo and local dev.
 *
 * Samples are authored as individual JSON files in ./data and discovered
 * generically via webpack's require.context — drop a new *.json in ./data and
 * it shows up as a suggestion card automatically, no code change needed.
 */

export interface Sample {
  id: string;
  emoji?: string;
  title: string;
  prompt: string;
  baselineRules?: string[];
}

// webpack require.context: enumerate every JSON file in ./data at build time.
// (Typed loosely because require.context isn't in the TS lib types.)
const ctx = (
  require as unknown as {
    context: (
      dir: string,
      recursive: boolean,
      regExp: RegExp
    ) => { keys: () => string[]; (id: string): unknown };
  }
).context("./data", false, /\.json$/);

export const SAMPLES: Sample[] = ctx
  .keys()
  .map((key) => ctx(key) as Sample)
  .filter((s) => s && s.id && s.prompt)
  .sort((a, b) => a.id.localeCompare(b.id));
