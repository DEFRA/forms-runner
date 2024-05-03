import nunjucks from 'nunjucks'

import config from '~/src/server/config.js'
import { ComponentBase } from '~/src/server/plugins/engine/components/ComponentBase.js'
import {
  type FormData,
  type FormSubmissionErrors
} from '~/src/server/plugins/engine/types.js'

export class Html extends ComponentBase {
  getViewModel(formData: FormData, errors?: FormSubmissionErrors) {
    const { options } = this
    let content = this.content
    if (config.allowUserTemplates) {
      content = nunjucks.renderString(content, { ...formData })
    }
    const viewModel = {
      ...super.getViewModel(formData, errors),
      content
    }

    if ('condition' in options && options.condition) {
      viewModel.condition = options.condition
    }

    return viewModel
  }
}
