import * as Lab from "@hapi/lab";

import createServer from "../../../src/server/index.js";

export const lab = Lab.script();
const { suite, before, after } = lab;

suite("Rate limit", () => {
  let server;

  // Create server before each test
  before(async () => {
    server = await createServer({
      formFileName: "basic-v1.json",
      formFilePath: __dirname,
      rateOptions: { userLimit: 1, userCache: { expiresIn: 5000 } },
    });
    server.route({
      method: "GET",
      path: "/start",
      handler: () => {
        return {};
      },
      options: {
        plugins: {
          "hapi-rate-limit": true,
        },
      },
    });
    await server.start();
  });
  after(async () => {
    await server.stop();
  });
});
