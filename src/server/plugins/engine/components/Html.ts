import { ComponentBase } from './ComponentBase'
import config from '../../../config'
import nunjucks from 'nunjucks'
import type { FormData, FormSubmissionErrors } from '../types'

export class Html extends ComponentBase {
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
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
