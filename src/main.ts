import "reflect-metadata";
import { createServer } from "node:http";

import { handleRequest } from "./dispatcher";
import { buildRoutes } from "./router";
import { Container } from "./container";
import { Controller } from "./decorators/controller";
import { Get } from "./decorators/methods";
import { Param, Query } from "./decorators/params";
import { LifecycleConfig } from "./types/lifecycle";
import { DEFAULT_LIFECYCLE_CONFIG } from "./lifecycle";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { AuthGuard } from "./guards/auth.guard";
import { requestContextMiddleware } from "./context/request-context";

@Controller("users")
class UsersController {
  @Get(":id")
  find(@Param("id") id: string, @Query("limit") limit: string) {
    return { id, limit };
  }
}
const container = new Container();
const routes = buildRoutes([UsersController]);

const lifecycleConfig: LifecycleConfig = {
  ...DEFAULT_LIFECYCLE_CONFIG,
  middleware: requestContextMiddleware,
  guard: new AuthGuard(),
  interceptor: new LoggingInterceptor(),
};

const server = createServer((request, response) => {
  void handleRequest(request, response, container, routes, lifecycleConfig);
});

server.listen(3000, () => {
  console.log("Server: http://localhost:3000");
});
