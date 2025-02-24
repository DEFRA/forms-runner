import { dirname, join } from 'node:path'

import { ComponentType } from '@defra/forms-model'
import nunjucks from 'nunjucks'
import resolvePkg from 'resolve'

import { config } from '~/src/config/index.js'
import { evaluateTemplate } from '~/src/server/plugins/engine/helpers.js'
import * as filters from '~/src/server/plugins/nunjucks/filters/index.js'

const govukFrontendPath = dirname(
  resolvePkg.sync('govuk-frontend/package.json')
)

export const paths = [
  join(config.get('appDir'), 'plugins/engine/views'),
  join(config.get('appDir'), 'views')
]

export const environment = nunjucks.configure(
  [...paths, join(govukFrontendPath, 'dist')],
  {
    trimBlocks: true,
    lstripBlocks: true,
    watch: config.get('isDevelopment'),
    noCache: config.get('isDevelopment')
  }
)

for (const [name, nunjucksFilter] of Object.entries(filters)) {
  environment.addFilter(name, nunjucksFilter)
}

/**
 * @this {NunjucksContext}
 * @param {FormSubmissionError[]} errors
 */
function checkErrorTemplates(errors) {
  const { context } = this.ctx

  if (!context) {
    return errors
  }

  errors.forEach((error) => {
    error.text = evaluateTemplate(error.text, context)
  })

  return errors
}

environment.addGlobal('checkErrorTemplates', checkErrorTemplates)

/**
 * @this {NunjucksContext}
 * @param {ComponentViewModel} component
 */
function checkComponentTemplates(component) {
  const { context } = this.ctx

  if (!context) {
    return component
  }

  if (component.isFormComponent) {
    // Evaluate label/legend text
    if (component.model.fieldset?.legend?.text) {
      const legend = component.model.fieldset.legend

      legend.text = evaluateTemplate(legend.text, context)
    } else if (component.model.label?.text) {
      const label = component.model.label

      label.text = evaluateTemplate(label.text, context)
    }

    // Evaluate error message
    if (component.model.errorMessage?.text) {
      const message = component.model.errorMessage

      message.text = evaluateTemplate(message.text, context)
    }
  } else if (component.type === ComponentType.Html) {
    const content = component.model.content

    if (typeof content === 'string') {
      component.model.content = evaluateTemplate(content, context)
    }
  }

  return component
}

environment.addGlobal('checkComponentTemplates', checkComponentTemplates)

/**
 * @this {NunjucksContext}
 * @param {string} template
 */
function evaluate(template) {
  const { context } = this.ctx

  return context ? evaluateTemplate(template, context) : template
}

environment.addGlobal('evaluate', evaluate)

/**
 * @import { NunjucksContext } from '~/src/server/plugins/nunjucks/types.js'
 * @import { FormSubmissionError } from '~/src/server/plugins/engine/types.js'
 * @import { ComponentViewModel } from '~/src/server/plugins/engine/components/types.js'
 */
