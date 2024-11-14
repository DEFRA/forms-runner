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

  const component3: ComponentDef = {
    name: 'detailsField',
    title: 'Find out more',
    type: ComponentType.Details,
    content: 'Some content goes here',
    options: {}
  }

  let page: Page
  let definition: FormDefinition
  let model: FormModel
  let controller: PageControllerBase

  beforeEach(() => {
    page = {
      path: '/first-page',
      title: 'When will you get married?',
      components: [component1, component2, component3],
      next: []
    }

    definition = {
      pages: [page],
      lists: [],
      sections: [],
      conditions: []
    }

    model = new FormModel(definition, {
      basePath: 'test'
    })

    controller = new PageControllerBase(model, page)
  })

  describe('Component collection', () => {
    it('returns the components for the page', () => {
      const { components } = controller.collection

      expect(components).toHaveLength(3)
      expect(components[0].name).toBe('dateField')
      expect(components[1].name).toBe('yesNoField')
      expect(components[2].name).toBe('detailsField')
    })

    it('returns the questions for the page', () => {
      const { questions } = controller.collection

      expect(questions).toHaveLength(2)
      expect(questions[0].name).toBe('dateField')
      expect(questions[1].name).toBe('yesNoField')
    })
  })

  describe('Form validation', () => {
    it('includes all field errors', () => {
      const result = controller.collection.validate()
      expect(result.errors).toHaveLength(4)
    })
  })
})
