import { expect } from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";

import { WebhookService } from "../../../../src/server/services/webhookService.js";
import * as httpService from "../../../../src/server/services/httpService.js";

export const lab = Lab.script();
const { suite, test, afterEach } = lab;

suite("Server WebhookService Service", () => {
  afterEach(() => {
    sinon.restore();
  });

  test("Webhook returns correct reference when payload is string", async () => {
    sinon.stub(httpService, "post").returns(
      Promise.resolve({
        res: {},
        payload: JSON.stringify({ reference: "1234" }),
      })
    );
    const loggerSpy = {
      error: () => sinon.spy(),
      info: () => sinon.spy(),
      debug: () => sinon.spy(),
    };
    const serverMock = { logger: loggerSpy };
    const webHookeService = new WebhookService(serverMock);
    const result = await webHookeService.postRequest("/url", {});
    expect(result).to.equal("1234");
  });

  test("Webhook returns correct reference when payload is object", async () => {
    sinon.stub(httpService, "post").returns(
      Promise.resolve({
        res: {},
        payload: { reference: "ABCD" },
      })
    );
    const loggerSpy = {
      error: () => sinon.spy(),
      info: () => sinon.spy(),
      debug: () => sinon.spy(),
    };
    const serverMock = { logger: loggerSpy };
    const webHookeService = new WebhookService(serverMock);
    const result = await webHookeService.postRequest("/url", {});
    expect(result).to.equal("ABCD");
  });
});
