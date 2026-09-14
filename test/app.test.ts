import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { InjectOptions } from "fastify";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

async function post(config: AppConfig, payload: InjectOptions["payload"]) {
  const app = createApp(config);
  try {
    return await app.inject({
      method: "POST",
      url: "/replace-dogs",
      headers: { "content-type": "application/json" },
      payload,
    });
  } finally {
    await app.close();
  }
}

describe("POST /replace-dogs", () => {
  it("preserves the key and replaces its value when JSON contains __proto__", async () => {
    const config = { maxReplacements: 1 };
    const input = '{"__proto__":"dog"}';
    const expectedBody = '{"__proto__":"cat"}';

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
    strictEqual(response.body, expectedBody);
  });

  it("preserves keys and replaces the value when constructor contains prototype", async () => {
    const config = { maxReplacements: 1 };
    const input = '{"constructor":{"prototype":"dog"}}';
    const expectedBody = '{"constructor":{"prototype":"cat"}}';

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
    strictEqual(response.body, expectedBody);
  });

  it("replaces up to the configured limit when a JSON request contains matching values", async () => {
    const config = { maxReplacements: 1 };
    const input = { animals: ["dog", "dog"] };
    const expectedResult = { animals: ["cat", "dog"] };

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
    deepStrictEqual(response.json(), expectedResult);
  });

  it("gives each request a fresh allowance when the same app handles multiple requests", async (t) => {
    const config = { maxReplacements: 1 };
    const input = '["dog","dog"]';
    const expectedBody = '["cat","dog"]';
    const app = createApp(config);
    t.after(() => app.close());

    const firstResponse = await app.inject({
      method: "POST",
      url: "/replace-dogs",
      headers: { "content-type": "application/json" },
      payload: input,
    });
    const secondResponse = await app.inject({
      method: "POST",
      url: "/replace-dogs",
      headers: { "content-type": "application/json" },
      payload: input,
    });

    strictEqual(firstResponse.statusCode, 200);
    strictEqual(firstResponse.body, expectedBody);
    strictEqual(secondResponse.statusCode, 200);
    strictEqual(secondResponse.body, expectedBody);
  });

  it("returns a JSON string when the request body is a matching root string", async () => {
    const config = { maxReplacements: 1 };
    const input = '"dog"';
    const expectedBody = '"cat"';

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.body, expectedBody);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
  });

  it("returns JSON null when the request body is null", async () => {
    const config = { maxReplacements: 1 };
    const input = "null";
    const expectedBody = "null";

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.body, expectedBody);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
  });

  it("replaces the decoded value when a root string contains a JSON escape", async () => {
    const config = { maxReplacements: 1 };
    const input = '"\\u0064og"';
    const expectedBody = '"cat"';

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
    strictEqual(response.body, expectedBody);
  });

  it("returns JSON false when the request body is false", async () => {
    const config = { maxReplacements: 1 };
    const input = "false";
    const expectedBody = "false";

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
    strictEqual(response.body, expectedBody);
  });

  for (const { name, input, expectedBody } of [
    {
      name: "returns the rounded number when a JSON integer exceeds JavaScript precision",
      input: "9007199254740993",
      expectedBody: "9007199254740992",
    },
    {
      name: "returns JSON null when a JSON number overflows JavaScript's finite range",
      input: "1e400",
      expectedBody: "null",
    },
  ]) {
    it(name, async () => {
      const config = { maxReplacements: 1 };

      const response = await post(config, input);

      strictEqual(response.statusCode, 200);
      strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
      strictEqual(response.body, expectedBody);
    });
  }

  it("returns JSON zero when the request body is zero", async () => {
    const config = { maxReplacements: 1 };
    const input = "0";
    const expectedBody = "0";

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.body, expectedBody);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
  });

  it("returns bad request when a JSON request body is empty", async () => {
    const config = { maxReplacements: 1 };
    const input = "";

    const response = await post(config, input);

    strictEqual(response.statusCode, 400);
  });

  it("returns bad request when the body is missing without a content type", async (t) => {
    const config = { maxReplacements: 1 };
    const app = createApp(config);
    t.after(() => app.close());

    const response = await app.inject({
      method: "POST",
      url: "/replace-dogs",
    });

    strictEqual(response.statusCode, 400);
    deepStrictEqual(response.json(), {
      statusCode: 400,
      error: "Bad Request",
      code: "REQUEST_BODY_REQUIRED",
      message: "Request body is required.",
    });
  });

  it("returns an empty JSON string when the request body is an empty JSON string", async () => {
    const config = { maxReplacements: 1 };
    const input = '""';
    const expectedBody = '""';

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.body, expectedBody);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
  });

  it("returns bad request when the request body contains malformed JSON", async () => {
    const config = { maxReplacements: 1 };
    const input = '{"animals":["dog",]}';

    const response = await post(config, input);

    strictEqual(response.statusCode, 400);
  });

  it("returns unsupported media type when the request body is plain text", async (t) => {
    const config = { maxReplacements: 1 };
    const input = "dog";
    const app = createApp(config);
    t.after(() => app.close());

    const response = await app.inject({
      method: "POST",
      url: "/replace-dogs",
      headers: { "content-type": "text/plain" },
      payload: input,
    });

    strictEqual(response.statusCode, 415);
  });

  it("returns content too large when a multibyte JSON body exceeds one MiB by one byte", async () => {
    const config = { maxReplacements: 1 };
    const maxBodyBytes = 1024 * 1024;
    const input = JSON.stringify("a".repeat(maxBodyBytes - 3) + "\u00e9");

    strictEqual(input.length, maxBodyBytes);
    strictEqual(Buffer.byteLength(input, "utf8"), maxBodyBytes + 1);

    const response = await post(config, input);

    strictEqual(response.statusCode, 413);
  });

  it("returns the complete JSON body when its size is exactly one MiB", async () => {
    const config = { maxReplacements: 1 };
    const maxBodyBytes = 1024 * 1024;
    const input = JSON.stringify("a".repeat(maxBodyBytes - 2));
    const expectedBody = input;

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
    strictEqual(response.body, expectedBody);
  });

  it("returns bad request when JSON nesting exceeds 100 levels with no replacements allowed", async () => {
    const config = { maxReplacements: 0 };
    const input = "[".repeat(101) + '"dog"' + "]".repeat(101);

    const response = await post(config, input);

    strictEqual(response.statusCode, 400);
    deepStrictEqual(response.json(), {
      statusCode: 400,
      error: "Bad Request",
      code: "JSON_DEPTH_LIMIT_EXCEEDED",
      message: "JSON nesting exceeds the maximum depth of 100.",
    });
  });

  it("preserves the JSON body when nesting is exactly 100 levels and no replacements are allowed", async () => {
    const config = { maxReplacements: 0 };
    const input = "[".repeat(100) + '"dog"' + "]".repeat(100);
    const expectedBody = input;

    const response = await post(config, input);

    strictEqual(response.statusCode, 200);
    strictEqual(response.headers["content-type"], "application/json; charset=utf-8");
    strictEqual(response.body, expectedBody);
  });

  it("returns bad request without a stack overflow when JSON nesting reaches 100000 levels", async () => {
    const config = { maxReplacements: 1 };
    const input = "[".repeat(100_000) + '"dog"' + "]".repeat(100_000);

    const response = await post(config, input);

    strictEqual(response.statusCode, 400);
    deepStrictEqual(response.json(), {
      statusCode: 400,
      error: "Bad Request",
      code: "JSON_DEPTH_LIMIT_EXCEEDED",
      message: "JSON nesting exceeds the maximum depth of 100.",
    });
  });
});
