import { expect } from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import { AutocompleteField } from "../../../../../../src/server/plugins/engine/components";
import type { FormSubmissionErrors } from "../../../../../../src/server/plugins/engine/types";

export const lab = Lab.script();
const { suite, describe, it } = lab;

const lists = [
  {
    name: "Countries",
    title: "Countries",
    type: "string",
    items: [
      {
        text: "United Kingdom",
        value: "United Kingdom",
        description: "",
        condition: "",
      },
      {
        text: "Thailand",
        value: "Thailand",
        description: "",
        condition: "",
      },
      {
        text: "Spain",
        value: "Spain",
        description: "",
        condition: "",
      },
      {
        text: "France",
        value: "France",
        description: "",
        condition: "",
      },
      {
        text: "Thailand",
        value: "Thailand",
        description: "",
        condition: "",
      },
    ],
  },
];

suite("AutocompleteField", () => {
  describe("Generated schema", () => {
    const componentDefinition = {
      subType: "field",
      type: "AutocompleteField",
      name: "MyAutocomplete",
      title: "Country?",
      options: {},
      list: "Countries",
      schema: {},
    };

    const formModel = {
      getList: () => lists[0],
      makePage: () => sinon.stub(),
    };

    const component = new AutocompleteField(componentDefinition, formModel);

    it("is required by default", () => {
      expect(component.formSchema.describe().flags.presence).to.equal(
        "required"
      );
    });

    it("validates correctly", () => {
      expect(component.formSchema.validate({}).error).to.exist();
    });

    it("includes the first empty item in items list", () => {
      const { items } = component.getViewModel(
        { lang: "en" },
        {} as FormSubmissionErrors
      );
      expect(items).to.exist();
      expect(items![0]).to.equal({ value: "" });
    });
  });
});
