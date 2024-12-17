import { ComponentType, type InsetTextComponent } from '@defra/forms-model'

import { ComponentCollection } from '~/src/server/plugins/engine/components/ComponentCollection.js'
import { type Guidance } from '~/src/server/plugins/engine/components/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import definition from '~/test/form/definitions/basic.js'

describe('InsetText', () => {
  let model: FormModel

  beforeEach(() => {
    model = new FormModel(definition, {
      basePath: 'test'
    })
  })

  describe('Defaults', () => {
    let def: InsetTextComponent
    let collection: ComponentCollection
    let guidance: Guidance

    beforeEach(() => {
      def = {
        title: 'Inset text guidance',
        name: 'myComponent',
        type: ComponentType.InsetText,
        content: 'Lorem ipsum dolor sit amet',
        options: {}
      } satisfies InsetTextComponent

      collection = new ComponentCollection([def], { model })
      guidance = collection.guidance[0]
    })

    describe('View model', () => {
      it('sets Nunjucks component defaults', () => {
        const viewModel = guidance.getViewModel()

        expect(viewModel).toEqual(
          expect.objectContaining({
            attributes: {},
            content: def.content
          })
        )
      })
    })
  })
})
