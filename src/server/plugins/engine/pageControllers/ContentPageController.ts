import { hasComponents, type Page } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  type ContentPageViewModel,
  type FormPayload
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

export class ContentPageController extends PageController {
  collection: ComponentCollection

  constructor(model: FormModel, pageDef: Page) {
    super(model, pageDef)

    // Components collection
    this.collection = new ComponentCollection(
      hasComponents(pageDef) ? pageDef.components : [],
      { model, page: this }
    )
  }

  getViewModel(
    request: FormRequest | FormRequestPayload,
    payload: FormPayload
  ): ContentPageViewModel {
    const { collection } = this

    const viewModel = super.getViewModel(request, payload)
    const components = collection.getViewModel(payload)

    return {
      ...viewModel,
      components
    }
  }
}
