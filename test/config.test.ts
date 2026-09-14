import { deepStrictEqual, ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { ConfigurationError, readConfig } from "../src/config.js";

describe("readConfig", () => {
  describe("valid MAX_REPLACEMENTS", () => {
    const cases = [
      { name: "decimal digits", value: "2", expected: 2 },
      { name: "zero", value: "0", expected: 0 },
      {
        name: "the largest safe integer",
        value: "9007199254740991",
        expected: 9007199254740991,
      },
      { name: "surrounding whitespace", value: " 2 ", expected: 2 },
      { name: "leading zeros", value: "002", expected: 2 },
    ];

    for (const { name, value, expected } of cases) {
      it(`returns the numeric limit for ${name}`, () => {
        const actualConfig = readConfig({ MAX_REPLACEMENTS: value });

        deepStrictEqual(actualConfig, { maxReplacements: expected });
      });
    }
  });

  describe("missing MAX_REPLACEMENTS", () => {
    it("throws ConfigurationError explaining that the setting is required", () => {
      throws(() => readConfig({}), (error: unknown) => {
        ok(error instanceof ConfigurationError);
        strictEqual(error.name, "ConfigurationError");
        strictEqual(error.message, "MAX_REPLACEMENTS is required.");
        return true;
      });
    });
  });

  describe("invalid MAX_REPLACEMENTS", () => {
    const cases = [
      { name: "an empty string", value: "" },
      { name: "trailing text", value: "2dogs" },
      { name: "a negative number", value: "-1" },
      { name: "a fractional number", value: "2.5" },
      { name: "exponent notation", value: "2e3" },
      { name: "an integer above the safe range", value: "9007199254740992" },
      { name: "whitespace only", value: "   " },
      { name: "hexadecimal notation", value: "0x10" },
      { name: "a positive sign", value: "+2" },
      { name: "decimal point notation", value: "2.0" },
      { name: "fractional text that rounds to an integer", value: "1.0000000000000001" },
      { name: "Infinity", value: "Infinity" },
      { name: "NaN", value: "NaN" },
      { name: "whitespace between digits", value: "2 3" },
    ];

    for (const { name, value } of cases) {
      it(`throws ConfigurationError for ${name}`, () => {
        throws(
          () => readConfig({ MAX_REPLACEMENTS: value }),
          (error: unknown) => {
            ok(error instanceof ConfigurationError);
            strictEqual(error.name, "ConfigurationError");
            strictEqual(
              error.message,
              "MAX_REPLACEMENTS must be a nonnegative safe integer.",
            );
            return true;
          },
        );
      });
    }
  });
});
