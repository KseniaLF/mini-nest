import "reflect-metadata";
import { createServer } from "node:http";

import { handleRequest } from "./dispatcher";
import { buildRoutes } from "./router";
import { Container } from "./container";
import { Controller } from "./decorators/controller";
import { Get } from "./decorators/methods";
import { Param, Query } from "./decorators/params";

@Controller("users")
class UsersController {
  @Get(":id")
  find(@Param("id") id: string, @Query("limit") limit: string) {
    return { id, limit };
  }
}
const container = new Container();
const routes = buildRoutes([UsersController]);

const server = createServer((request, response) => {
  void handleRequest(request, response, container, routes);
});

server.listen(3000, () => {
  console.log("Server: http://localhost:3000");
});
