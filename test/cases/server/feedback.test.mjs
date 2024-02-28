import { expect } from "@hapi/code";
import * as Lab from "@hapi/lab";
import cheerio from "cheerio";
import createServer from "../../../src/server/index.js";

export const lab = Lab.script();
const { suite, test, before, after } = lab;

suite(`Feedback`, () => {
  let server;

  // Create server before each test
  before(async () => {
    server = await createServer({
      formFileName: `feedback.json`,
      formFilePath: __dirname,
    });
    await server.start();
  });

  after(async () => {
    await server.stop();
  });
  test("get request returns configured form page", async () => {
    const options = {
      method: "GET",
      url: `/forms-runner/feedback/uk-passport`,
    };

    const response = await server.inject(options);
    expect(response.statusCode).to.equal(200);
    expect(response.headers["content-type"]).to.include("text/html");

    const $ = cheerio.load(response.payload);

    expect($(".govuk-phase-banner__text .govuk-link").attr("href")).to.equal(
      "mailto:test@feedback.cat"
    );
  });
});
