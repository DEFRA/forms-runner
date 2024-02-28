import { expect } from "@hapi/code";
import * as Lab from "@hapi/lab";
import { loadPreConfiguredForms } from "../../../../../../src/server/plugins/engine/services/configurationService";
import testFormJSON from "../../../../../../src/server/forms/test.json" with { type: "json" };
import reportFormJSON from "../../../../../../src/server/forms/report-a-terrorist.json" with { type: "json" };

export const lab = Lab.script();
const { suite, test } = lab;

suite("Engine Plugin ConfigurationService", () => {
  test("it loads pre-configured forms configuration correctly ", () => {
    const result = loadPreConfiguredForms();

    expect(result).to.contain([
      {
        configuration: testFormJSON,
        id: "test",
      },
      {
        id: "report-a-terrorist",
        configuration: reportFormJSON,
      },
    ]);
  });
});
