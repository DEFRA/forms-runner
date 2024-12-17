import { ComponentType, type DetailsComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type Guidance } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/basic.js'

describe('Details', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: DetailsComponent
    let collection: ComponentCollection
    let guidance: Guidance

    beforeEach(() => {
      def = {
        title: 'Details guidance',
        name: 'myComponent',
        type: ComponentType.Details,
        content: 'Lorem ipsum dolor sit amet',
        options: {}
      } satisfies DetailsComponent

      collection = new ComponentCollection([def], { model })
      guidance = collection.guidance[0]
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = guidance.getViewModel()

        expect(viewModel).toEqual(
          expect.objectContaining({
            attributes: {},
            html: def.content,
            summaryHtml: def.title
          })
        )
      })
    })
  })
})
