import { expect } from "@hapi/code";
import * as Lab from "@hapi/lab";
import createServer from "../../../src/server/index.js";
import config from "../../../src/server/config.js";

export const lab = Lab.script();
const { suite, test, before, after } = lab;

suite(`/health-check Route`, () => {
  let server;

  before(async () => {
    config.lastCommit = "Last Commit";
    config.lastTag = "Last Tag";
    server = await createServer({});
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  test("/health-check route response is correct", async () => {
    const options = {
      method: "GET",
      url: "/forms-runner/health-check",
    };

    const { result } = await server.inject(options);

    expect(result.status).to.equal("OK");
    expect(result.lastCommit).to.equal("Last Commit");
    expect(result.lastTag).to.equal("Last Tag");
    expect(result.time).to.be.a.string();
  });
});
