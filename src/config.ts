export type AppConfig = {
  readonly maxReplacements: number;
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Reads `MAX_REPLACEMENTS` as a nonnegative safe integer.
 * @throws {ConfigurationError} If the value is missing, blank, or invalid.
 */
export function readConfig(
  environment: Readonly<Record<string, string | undefined>>,
): AppConfig {
  const configuredLimit = environment.MAX_REPLACEMENTS;

  if (configuredLimit === undefined) {
    throw new ConfigurationError("MAX_REPLACEMENTS is required.");
  }

  const normalizedLimit = configuredLimit.trim();
  const maxReplacements = Number(normalizedLimit);

  if (!/^\d+$/.test(normalizedLimit) || !Number.isSafeInteger(maxReplacements)) {
    throw new ConfigurationError(
      "MAX_REPLACEMENTS must be a nonnegative safe integer.",
    );
  }

  return { maxReplacements };
}
