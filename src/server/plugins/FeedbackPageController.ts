import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'
import { SummaryPageController } from '@defra/forms-engine-plugin/controllers/SummaryPageController.js'
import {
  type AnyFormRequest,
  type FormContext,
  type FormContextRequest
} from '@defra/forms-engine-plugin/engine/types.js'
import {
  type FormRequestPayload,
  type FormResponseToolkit
} from '@defra/forms-engine-plugin/types'

import { type FeedbackPageViewModel } from '~/src/server/models/FeedbackPageViewModel.js'

export class FeedbackPageController extends QuestionPageController {
  allowSaveAndExit = false

  getViewModel(
    request: FormContextRequest,
    context: FormContext
  ): FeedbackPageViewModel {
    const translator = this.getTranslator(request as unknown as AnyFormRequest)
    const viewModel = super.getViewModel(
      request,
      context,
      translator
    ) as FeedbackPageViewModel
    return {
      ...viewModel,
      hidePhaseBanner: true,
      submitButtonText: translator.t('common.sendFeedback'),
      name: context.state.formName as string | undefined,
      t: translator.t
    }
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler() {
    return async (
      request: FormRequestPayload,
      context: FormContext,
      h: FormResponseToolkit
    ) => {
      const { collection, viewName, model } = this
      const { isForceAccess, state, evaluationState } = context

      /**
       * If there are any errors, render the page with the parsed errors
       * @todo Refactor to match POST REDIRECT GET pattern
       */
      if (context.errors || isForceAccess) {
        const viewModel = this.getViewModel(request, context)
        viewModel.errors = collection.getViewErrors(
          this.getTranslator(request),
          viewModel.errors
        )

        // Filter our components based on their conditions using our evaluated state
        viewModel.components = this.filterConditionalComponents(
          viewModel,
          model,
          evaluationState
        )

        return h.view(viewName, viewModel)
      }

      // Save state
      await this.setState(request, state)

      const pageController = context.pageMap.get(context.paths[0])
      if (!pageController) {
        throw new Error('Summary page controller not found')
      }
      const summary = new SummaryPageController(model, pageController.pageDef)
      return summary.handleFormSubmit(request, context, h)
    }
  }
}
