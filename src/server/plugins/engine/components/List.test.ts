import { ComponentType, type ListComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type Guidance } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/basic.js'

describe('List', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: ListComponent
    let collection: ComponentCollection
    let guidance: Guidance

    beforeEach(() => {
      def = {
        title: 'List guidance',
        name: 'myComponent',
        type: ComponentType.List,
        list: 'licenceLengthDays',
        options: {}
      } satisfies ListComponent

      collection = new ComponentCollection([def], { model })
      guidance = collection.guidance[0]
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = guidance.getViewModel()

        expect(viewModel).toEqual(
          expect.objectContaining({
            attributes: {},
            content: {
              title: def.title,
              text: ''
            }
          })
        )
      })
    })

    describe('List items', () => {
      it('returns list items', () => {
        expect(guidance).toHaveProperty('items', [
          {
            id: '52fc51fc-c75a-4b08-9c9e-6bd99b9bc49b',
            text: '1 day',
            value: 1,
            description:
              'Valid for 24 hours from the start time that you select'
          },
          {
            id: '56b7b34f-23b3-4446-ac8e-b2443d18588e',
            text: '8 day',
            value: 8,
            description:
              'Valid for 8 consecutive days from the start time that you select'
          },
          {
            id: '1af54fbc-eec2-4e1e-bd53-2415abf62677',
            text: '12 months',
            value: 365,
            description:
              '12-month licences are now valid for 365 days from their start date and can be purchased at any time during the year'
          }
        ])
      })
    })
  })
})
