import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config.js";
import {
  JsonDepthLimitError,
  replaceDogs,
  type JsonValue,
} from "./replace-dogs.js";

/**
 * Creates the app without starting the listener.
 * @param config - Configuration already validated by `readConfig`.
 */
export function createApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    bodyLimit: 1024 * 1024,
    // Keep special JSON keys. The handler only updates existing own properties.
    onProtoPoisoning: "ignore",
    onConstructorPoisoning: "ignore",
  });
  app.removeContentTypeParser("text/plain");

  app.post<{ Body: JsonValue | undefined }>("/replace-dogs", (request, reply) => {
    if (request.body === undefined) {
      const error = Object.assign(new Error("Request body is required."), {
        code: "REQUEST_BODY_REQUIRED",
      });
      return reply.code(400).send(error);
    }

    try {
      const result = replaceDogs(request.body, config.maxReplacements);
      // Serialize explicitly so root strings and null are sent as JSON.
      return reply.type("application/json").send(JSON.stringify(result));
    } catch (error) {
      if (error instanceof JsonDepthLimitError) {
        return reply.code(400).send(error);
      }

      throw error;
    }
  });

  return app;
}
