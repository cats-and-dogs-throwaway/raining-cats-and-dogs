export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const MAX_JSON_DEPTH = 100;

export class JsonDepthLimitError extends Error {
  readonly code = "JSON_DEPTH_LIMIT_EXCEEDED";

  constructor() {
    super(`JSON nesting exceeds the maximum depth of ${MAX_JSON_DEPTH}.`);
    this.name = "JsonDepthLimitError";
  }
}

/**
 * Replaces exact "dog" values with "cat" in depth-first order.
 * Mutates arrays and objects in place; object keys follow `Object.keys` order.
 *
 * @param value - Parsed JSON.
 * @param maxReplacements - Nonnegative safe integer, validated by the caller.
 * @returns The updated value. Use this return value because root strings can change.
 * @throws {JsonDepthLimitError} With code `JSON_DEPTH_LIMIT_EXCEEDED` if nesting
 * exceeds 100 array/object levels, before any mutation.
 */
export function replaceDogs(
  value: JsonValue,
  maxReplacements: number,
): JsonValue {
  assertWithinDepthLimit(value, 0);

  let remaining = maxReplacements;

  function visit(value: JsonValue): JsonValue {
    if (remaining === 0) {
      return value;
    }

    if (value === "dog") {
      remaining -= 1;
      return "cat";
    }

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const child = value[i];

        if (child !== undefined) {
          value[i] = visit(child);
        }
      }
    } else if (value !== null && typeof value === "object") {
      for (const key of Object.keys(value)) {
        const child = value[key];

        if (child !== undefined) {
          value[key] = visit(child);
        }
      }
    }

    return value;
  }

  return visit(value);
}

function assertWithinDepthLimit(value: JsonValue, parentDepth: number): void {
  if (value === null || typeof value !== "object") {
    return;
  }

  const depth = parentDepth + 1;

  if (depth > MAX_JSON_DEPTH) {
    throw new JsonDepthLimitError();
  }

  const children = Array.isArray(value) ? value : Object.values(value);

  for (const child of children) {
    assertWithinDepthLimit(child, depth);
  }
}
