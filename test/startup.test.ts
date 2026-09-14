import { strictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function runServer(environment: NodeJS.ProcessEnv) {
  const startupScript = fileURLToPath(new URL("../src/server.js", import.meta.url));

  return spawnSync(process.execPath, [startupScript], {
    env: environment,
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
}

describe("server startup configuration", () => {
  const configurationCases = [
    {
      name: "missing",
      value: undefined,
      message: "MAX_REPLACEMENTS is required.",
    },
    {
      name: "invalid",
      value: "-1",
      message: "MAX_REPLACEMENTS must be a nonnegative safe integer.",
    },
  ];

  for (const { name, value, message } of configurationCases) {
    it(`reports the configuration error and exits with code 1 when MAX_REPLACEMENTS is ${name}`, () => {
      const environment = { ...process.env };
      if (value === undefined) {
        delete environment.MAX_REPLACEMENTS;
      } else {
        environment.MAX_REPLACEMENTS = value;
      }

      const result = runServer(environment);

      strictEqual(result.error, undefined);
      strictEqual(result.status, 1, result.stderr);
      strictEqual(result.stdout, "");
      strictEqual(result.stderr.trim(), message);
    });
  }
});
