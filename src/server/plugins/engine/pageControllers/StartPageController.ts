import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  type FormPayload,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'
import { type FormRequest } from '~/src/server/routes/types.js'

export class StartPageController extends PageController {
  /**
   * The controller which is used when Page["controller"] is defined as "./pages/start.js"
   * This page should not be used in production. This page is helpful for prototyping start pages within the app,
   * but start pages should really live on gov.uk (whitehall publisher) so a user can be properly signposted.
   */

  getViewModel(
    request: FormRequest,
    payload: FormPayload,
    errors?: FormSubmissionErrors
  ) {
    return {
      ...super.getViewModel(request, payload, errors),
      isStartPage: true
    }
  }
}
