import { type PageController } from '@defra/forms-engine-plugin/controllers/PageController.js'
import { QuestionPageController } from '@defra/forms-engine-plugin/controllers/QuestionPageController.js'
import { SummaryPageController } from '@defra/forms-engine-plugin/controllers/SummaryPageController.js'
import {
  type FormContext,
  type FormContextRequest
} from '@defra/forms-engine-plugin/engine/types.js'
import {
  type FormPageViewModel,
  type FormRequestPayload,
  type FormResponseToolkit
} from '@defra/forms-engine-plugin/types'

export class FeedbackPageController extends QuestionPageController {
  getViewModel(
    request: FormContextRequest,
    context: FormContext
  ): FormPageViewModel {
    const viewModel = super.getViewModel(request, context)
    return {
      ...viewModel,
      allowSaveAndExit: false,
      phaseTag: undefined,
      submitButtonText: 'Send feedback',
      name: context.state.formName
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
      // Should not have to coerce the type - ticket to resolve later https://eaflood.atlassian.net/browse/DF-555
      const { viewName, model } = this as unknown as PageController
      const { collection } = this
      const { isForceAccess, state, evaluationState } = context

      /**
       * If there are any errors, render the page with the parsed errors
       * @todo Refactor to match POST REDIRECT GET pattern
       */
      if (context.errors || isForceAccess) {
        const viewModel = this.getViewModel(request, context)
        viewModel.errors = collection.getViewErrors(viewModel.errors)

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

      const summary = new SummaryPageController(
        model,
        context.pageMap.get(context.paths[0])
      )
      return summary.handleFormSubmit(request, context, h)
    }
  }
}
