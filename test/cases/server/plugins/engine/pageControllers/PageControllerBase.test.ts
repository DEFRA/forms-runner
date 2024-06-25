import { ComponentType, type FormDefinition } from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { PageControllerBase } from '~/src/server/plugins/engine/pageControllers/index.js'

describe('PageControllerBase', () => {
  test('getErrors correctly parses ISO string to readable string', () => {
    const def: FormDefinition = {
      title: 'When will you get married?',
      path: '/first-page',
      name: '',
      components: [
        {
          name: 'date',
          options: {
            required: true,
            maxDaysInFuture: 30
          },
          type: ComponentType.DatePartsField,
          title: 'Date of marriage',
          schema: {}
        }
      ],
      next: [
        {
          path: '/second-page'
        }
      ]
    }
    const page = new PageControllerBase(
      new FormModel(
        {
          pages: [],
          startPage: '/start',
          sections: [],
          lists: [],
          conditions: []
        },
        {}
      ),
      def
    )
    const error = {
      error: {
        details: [
          {
            message:
              '"Date of marriage" must be on or before 2021-12-25T00:00:00.000Z',
            path: ['date']
          },
          {
            message: 'something invalid',
            path: ['somethingElse']
          }
        ]
      }
    }

    expect(page.getErrors(error)).toEqual({
      titleText: 'There is a problem',
      errorList: [
        {
          path: 'date',
          href: '#date',
          name: 'date',
          text: `"Date of marriage" must be on or before 25 December 2021`
        },
        {
          path: 'somethingElse',
          href: '#somethingElse',
          name: 'somethingElse',
          text: 'something invalid'
        }
      ]
    })
  })
})
