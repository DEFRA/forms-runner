import {
  ComponentType,
  type ComponentDef,
  type FormDefinition,
  type Page
} from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/PageControllerBase.js'

describe('PageControllerBase', () => {
  const component1: ComponentDef = {
    name: 'dateField',
    title: 'Date of marriage',
    type: ComponentType.DatePartsField,
    options: {}
  }

  const component2: ComponentDef = {
    name: 'yesNoField',
    title: 'Have you previously been married?',
    type: ComponentType.YesNoField,
    options: {}
  }

  let page: Page
  let definition: FormDefinition
  let formModel: FormModel
  let controller: PageControllerBase

  beforeEach(() => {
    page = {
      path: '/first-page',
      title: 'When will you get married?',
      components: [component1, component2],
      next: []
    }

    definition = {
      pages: [page],
      lists: [],
      sections: [],
      conditions: []
    }

    formModel = new FormModel(definition, {
      basePath: 'test'
    })

    controller = new PageControllerBase(formModel, page)
  })

  describe('Form validation', () => {
    it('includes all field errors', () => {
      const result = controller.components.validate()
      expect(result.errors).toHaveLength(4)
    })
  })
})
