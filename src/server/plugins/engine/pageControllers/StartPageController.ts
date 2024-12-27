import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import {
  type FormPayload,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import { type FormRequest } from '~/src/server/routes/types.js'

export class StartPageController extends QuestionPageController {
  /**
   * The controller which is used when Page["controller"] is defined as "./pages/start.js"
   * This page should not be used in production. This page is helpful for prototyping start pages within the app,
   * but start pages should really live on gov.uk (whitehall publisher) so a user can be properly signposted.
   */

  getViewModel(
    request: FormRequest,
    state: FormSubmissionState,
    payload: FormPayload,
    errors?: FormSubmissionError[]
  ) {
    return {
      ...super.getViewModel(request, state, payload, errors),
      isStartPage: true
    }
  }
}
