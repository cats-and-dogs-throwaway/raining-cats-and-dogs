# JSON replacement endpoint

## Run (Windows)

Requires Node.js 24.21.0 or newer within 24.x, and npm.

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Set `MAX_REPLACEMENTS` in `.env`, or in the terminal as an environment variable:

```powershell
$env:MAX_REPLACEMENTS = '1'
npm start
```

The server listens at `http://127.0.0.1:3000`. From another terminal:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3000/replace-dogs' -ContentType 'application/json' -Body '["dog","dog"]'
```

With a limit of one, the response is `["cat","dog"]`.
`npm start` builds first. Invalid configuration or
a listen error is written to stderr and exits with code 1.

## Configuration

`MAX_REPLACEMENTS` is required. It accepts decimal digits from `0` to
`Number.MAX_SAFE_INTEGER`, with optional surrounding whitespace and leading zeros.
Signs, decimal points, exponent/hex notation, internal whitespace, and trailing
text are rejected. Missing, blank, or out-of-range values also stop startup.
Zero disables replacement. Each request gets a fresh limit.

Node loads `.env` with `--env-file-if-exists=.env`. Existing environment variables
take precedence, even if empty. Through npm, `.env` is read from the project root;
running Node directly uses the current directory.

## Assumptions

- The route is `POST /replace-dogs`. Send `Content-Type: application/json`.
- Any JSON root is accepted, including strings, numbers, booleans, and `null`.
  The response is the JSON value itself.
- The replacement limit applies to each request across the entire payload.
  Zero disables replacement, and every request gets a fresh limit.
- Only exact, case-sensitive string values match. `"Dog"`, `"dogdog"`, and
  `" dog "` stay unchanged. Escaped strings are decoded first, so `"\u0064og"`
  matches. Keys, including `"dog"`, stay unchanged.
- Values are visited depth-first. Arrays go left to right; objects use
  `Object.keys` order: array-index keys in numeric order, then other keys in
  insertion order. With a limit of one, `[["dog"],"dog"]` becomes
  `[["cat"],"dog"]`. Later matches stay unchanged once the limit is reached.
- Bodies are limited to 1 MiB (1,048,576 bytes) and 100 levels of nesting.
  Each array or object adds a level; primitives add none. Empty bodies are
  invalid, but JSON `null` and `""` are valid.

## HTTP responses

| Result | HTTP status | Error `code` |
| --- | --- | --- |
| Valid JSON within the limits | 200 | Not an error response |
| Missing body without a content type | 400 | `REQUEST_BODY_REQUIRED` |
| Empty body with `Content-Type: application/json` | 400 | `FST_ERR_CTP_EMPTY_JSON_BODY` |
| Malformed or whitespace-only JSON | 400 | `FST_ERR_CTP_INVALID_JSON_BODY` |
| Nesting exceeds 100 levels | 400 | `JSON_DEPTH_LIMIT_EXCEEDED` |
| Body exceeds 1 MiB | 413 | `FST_ERR_CTP_BODY_TOO_LARGE` |
| Unsupported media type, including `text/plain` | 415 | `FST_ERR_CTP_INVALID_MEDIA_TYPE` |

Error responses contain Fastify's `statusCode`, `error`, and `message` fields.
The documented error cases also include `code`: the application sets
`REQUEST_BODY_REQUIRED` and `JSON_DEPTH_LIMIT_EXCEEDED`, while Fastify supplies
the parser error codes. Clients can use the HTTP status and `code` to identify
these failures without comparing message text. Other unexpected errors may omit
`code` if the original error does not define it. See
[Fastify's error response documentation](https://fastify.dev/docs/latest/Reference/Errors/#what-the-default-error-handler-sends).

## Trade-offs

- Fastify handles parsing, body size limits, and HTTP test requests. This keeps
  the HTTP code small at the cost of a framework dependency. Configuration is
  validated once at startup. `replaceDogs` works on parsed JSON without depending
  on HTTP or environment variables.
- Custom errors are exported by the module that owns the failure:
  `ConfigurationError` from `config.ts` and `JsonDepthLimitError` from
  `replace-dogs.ts`. Callers can distinguish them with `instanceof`. Startup
  reports configuration errors and exits; the HTTP handler maps depth errors
  to status 400.
- Arrays and objects are updated in place to avoid a deep copy, so callers lose
  the original contents. Callers must use the return value because a root string
  can change. The handler serializes the result explicitly so root strings and
  `null` are sent as JSON.
- Depth is checked across the whole document before any changes, even when the
  replacement limit is zero. This adds a pass but prevents partial changes to
  input that is too deeply nested.
- Native JSON parsing and serialization keep the implementation simple but
  change formatting and escape spelling. Duplicate keys keep their last value.
  Numbers follow JavaScript precision: `9007199254740993` rounds to
  `9007199254740992`, and `1e400` becomes `null` in the response. These rules also
  apply when the replacement limit is zero.
- `__proto__`, `constructor`, and `prototype` are kept as JSON keys. Both Fastify
  poisoning options are set to `"ignore"`. This permits the keys; it does not
  sanitize them. The handler only updates existing own properties. Adding merges
  such as `Object.assign({}, body)` would need a separate review because they
  can invoke the inherited `__proto__` setter.

### High traffic

Requests share no state, so the service can run across multiple processes or
replicas. Body and depth limits bound individual requests, and updating in place
avoids a deep copy. The limits reject larger or more deeply nested JSON even
when it is otherwise valid. They are choices for this exercise, not measured
production limits.

Parsing, depth checks, replacement, and serialization all run synchronously on
one event loop. Reaching the replacement limit skips further descent, but parent
loops still finish and the whole result is serialized. Large requests block
other work, and concurrent requests add memory use. Throughput and memory use
have not been measured.

## Tests

Transformer and configuration tests call `replaceDogs` and `readConfig` directly
as unit tests, including the transformer's in-place mutation contract. HTTP
integration tests exercise Fastify's parsing, route handling, and serialization
through request injection. Startup integration tests run the compiled entry point
in a child process with controlled configuration.

`npm run build` checks types and compiles source and tests to `dist`.
`npm run typecheck` checks types without writing files.

`npm test` builds and runs all tests: replacement, configuration, HTTP handling,
and startup configuration failures. Startup tests check stderr and exit status
for missing or invalid configuration.

## With more time

- Measure throughput, latency, CPU, and memory with small and near-limit payloads
  at different concurrency levels before changing the implementation.
- Add finite request/connection timeouts, graceful shutdown, health checks, and
  request/error metrics. The current timeouts use Fastify's defaults of zero, so
  incomplete requests can keep connections open indefinitely.
- For deployment, configure proxy limits and
  rate limiting, and add replicas if measurements call for them. Log request
  status and duration, not bodies. Profile before considering streaming, workers,
  or caching; add lossless number handling only if required.
- Logging, metrics, and alerting. Enable Fastify's built-in pino logger
  (`Fastify({ logger: true })`) for structured JSON request logs with request id,
  method, route, status, and duration. Expose `/metrics` (request count and
  latency histogram by status, event-loop delay, heap used) and `/health`, which
  fails when event-loop delay is high so the load balancer drains the process.
  Page on 5xx rate, p99 latency, and health-check failures; keep 4xx volume on a
  dashboard, since it reflects client behaviour rather than service health.
