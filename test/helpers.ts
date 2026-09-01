import { createServer } from "node:http";

import type { LifecycleConfig } from "../src/types/lifecycle";
import type { RouteDefinition } from "../src/types/routing";

import { Container } from "../src/container";
import { handleRequest } from "../src/dispatcher";

export async function startTestServer(
  container: Container,
  routes: RouteDefinition[],
  lifecycleConfig?: LifecycleConfig,
): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const server = createServer((request, response) => {
    void handleRequest(request, response, container, routes, lifecycleConfig);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);

    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("Expected server to listen on a TCP port");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  const close = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  return { baseUrl, close };
}
