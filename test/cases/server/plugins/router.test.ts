import { expect } from "@hapi/code";
import * as Lab from "@hapi/lab";
import createServer from "../../../../src/server";

export const lab = Lab.script();
const { suite, test, before, after } = lab;

suite("Server Router", () => {
  let server;

  before(async () => {
    server = await createServer({});
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  test("cookies page is served", async () => {
    const options = {
      method: "GET",
      url: `/forms-runner/help/cookies`,
    };

    const res = await server.inject(options);

    expect(res.statusCode).to.equal(200);
    expect(
      res.result.indexOf(
        `<h1 class="govuk-heading-l">Cookies on Defra forms</h1>`
      ) > -1
    ).to.equal(true);
  });

  test("cookies preferences are set", async () => {
    const options = {
      method: "POST",
      payload: {
        cookies: "accept",
      },
      url: "/forms-runner/help/cookies",
    };

    const res = await server.inject(options);

    expect(res.statusCode).to.equal(302);
  });

  test("accessibility statement page is served", async () => {
    const options = {
      method: "GET",
      url: `/forms-runner/help/accessibility-statement`,
    };

    const res = await server.inject(options);

    expect(res.statusCode).to.equal(200);
    expect(
      res.result.indexOf(
        '<h1 class="govuk-heading-l">Accessibility Statement</h1>'
      ) > -1
    ).to.equal(true);
  });

  test("terms and conditions page is served", async () => {
    const options = {
      method: "GET",
      url: `/forms-runner/help/terms-and-conditions`,
    };

    const res = await server.inject(options);

    expect(res.statusCode).to.equal(200);
    expect(
      res.result.indexOf(
        '<h1 class="govuk-heading-l">Terms and conditions</h1>'
      ) > -1
    ).to.equal(true);
  });
});
