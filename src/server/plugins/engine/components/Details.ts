import { ComponentBase } from "./ComponentBase";
import type { FormData, FormSubmissionErrors } from "../types";

export class Details extends ComponentBase {
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const { options } = this;

    const viewModel = {
      ...super.getViewModel(formData, errors),
      summaryHtml: this.title,
      html: this.content,
    };

    if ("condition" in options && options.condition) {
      viewModel.condition = options.condition;
    }

    return viewModel;
  }
}
