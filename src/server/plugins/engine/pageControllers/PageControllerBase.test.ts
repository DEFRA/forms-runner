import {
  ComponentType,
  type ComponentDef,
  type FormDefinition,
  type Page
} from '@defra/forms-model'
import { ValidationError } from 'joi'

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
    it('includes title text', () => {
      const result = controller.validateForm({})

      expect(result.errors).toEqual(
        expect.objectContaining({
          titleText: 'There is a problem'
        })
      )
    })

    it('includes all field errors', () => {
      const result = controller.validateForm({})
      expect(result.errors?.errorList).toHaveLength(4)
    })
  })

  describe('Error formatting', () => {
    it('formats dates with ISO strings', () => {
      const errors = controller.getErrors({
        error: new ValidationError(
          'Date of marriage example',
          [
            {
              message:
                'Date of marriage must be on or before 2021-12-25T00:00:00.000Z',
              path: ['dateField'],
              type: 'date.max',
              context: {
                key: 'dateField',
                title: 'date of marriage'
              }
            }
          ],
          undefined
        )
      })

      expect(errors?.errorList).toEqual(
        expect.arrayContaining([
          {
            path: ['dateField'],
            href: '#dateField',
            name: 'dateField',
            text: 'Date of marriage must be on or before 25 December 2021',
            context: {
              key: 'dateField',
              title: 'date of marriage'
            }
          }
        ])
      )
    })

    it('formats first letter to uppercase', () => {
      const errors = controller.getErrors({
        error: new ValidationError(
          'Date of marriage example',
          [
            {
              message: 'something invalid',
              path: ['yesNoField'],
              type: 'string.pattern.base',
              context: {
                key: 'yesNoField'
              }
            }
          ],
          undefined
        )
      })

      expect(errors?.errorList).toEqual([
        {
          path: ['yesNoField'],
          href: '#yesNoField',
          name: 'yesNoField',
          text: 'Something invalid',
          context: {
            key: 'yesNoField'
          }
        }
      ])
    })
  })
})
