/**
 * Sandbox env files: dummy values that let the backend run anywhere without a
 * real secret. Pure helpers behind `npm run setup:sandbox`.
 */

export const GENERATE_MARKER = '__GENERATE__';

export type FillResult =
  | { ok: true; content: string; generatedKeys: string[] }
  | { ok: false; error: string };

const ENV_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

/** Keys assigned in a .env file (comments and blank lines skipped). */
export const parseEnvKeys = (content: string): string[] =>
  content
    .split(/\r?\n/)
    .map((line) => ENV_LINE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match[1]);

/**
 * Replace every `KEY=__GENERATE__` line with a value from `generate(key)`.
 * Fails rather than writing a file that still holds a marker.
 */
export const fillSandboxTemplate = (
  template: string,
  generate: (key: string) => string | undefined,
): FillResult => {
  const generatedKeys: string[] = [];
  const missing: string[] = [];

  const content = template
    .split('\n')
    .map((line) => {
      const match = ENV_LINE.exec(line.trim());
      if (!match || match[2].trim() !== GENERATE_MARKER) return line;
      const value = generate(match[1]);
      if (!value) {
        missing.push(match[1]);
        return line;
      }
      generatedKeys.push(match[1]);
      return `${match[1]}=${value}`;
    })
    .join('\n');

  if (missing.length > 0) {
    return { ok: false, error: `No generator for: ${missing.join(', ')}` };
  }
  return { ok: true, content, generatedKeys };
};

/**
 * Keys a leftover base `.env` would still feed into a sandbox run: the env
 * loader reads `.env.development` first and only fills gaps from `.env`.
 */
export const keysLeakingFromBaseEnv = (baseEnv: string, sandboxEnv: string): string[] => {
  const covered = new Set(parseEnvKeys(sandboxEnv));
  return parseEnvKeys(baseEnv).filter((key) => !covered.has(key));
};
