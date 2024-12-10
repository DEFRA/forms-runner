import { ComponentType, type ComponentDef } from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import definition from '~/test/form/definitions/file-upload-basic.js'

describe('FileUploadPageController', () => {
  let model: FormModel
  let controller: FileUploadPageController

  beforeEach(() => {
    const { pages } = structuredClone(definition)

    model = new FormModel(definition, {
      basePath: 'test'
    })

    controller = new FileUploadPageController(model, pages[0])
  })

  describe('Constructor', () => {
    const textComponent: ComponentDef = {
      name: 'fullName',
      title: 'Full name',
      type: ComponentType.TextField,
      options: {},
      schema: {}
    }

    it('throws unless there is exactly 1 file upload component', () => {
      const { pages } = structuredClone(definition)

      // @ts-expect-error - Allow invalid component for test
      pages[0].components = [textComponent]

      expect(() => new FileUploadPageController(model, pages[0])).toThrow(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${pages[0].path}'`
      )
    })

    it('throws unless file upload component is the first in the form', () => {
      const { pages } = structuredClone(definition)

      // @ts-expect-error - Allow invalid component for test
      pages[0].components.unshift(textComponent)

      expect(() => new FileUploadPageController(model, pages[0])).toThrow(
        `Expected 'fileUpload' to be the first form component in FileUploadPageController '${pages[0].path}'`
      )
    })
  })

  describe('Form validation', () => {
    it('includes title text and error', () => {
      const result = controller.collection.validate()

      expect(result.errors).toEqual([
        {
          path: ['fileUpload'],
          href: '#fileUpload',
          name: 'fileUpload',
          text: 'Select upload something',
          context: {
            key: 'fileUpload',
            label: 'upload something',
            title: 'Upload something'
          }
        }
      ])
    })

    it('includes all field errors', () => {
      const result = controller.collection.validate()
      expect(result.errors).toHaveLength(1)
    })
  })
})
