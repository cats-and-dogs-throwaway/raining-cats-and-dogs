import { createApp } from "./app.js";
import { readConfig } from "./config.js";

try {
  const config = readConfig(process.env);
  const app = createApp(config);
  const address = await app.listen({ host: "127.0.0.1", port: 3000 });
  console.log(`Listening on ${address}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
