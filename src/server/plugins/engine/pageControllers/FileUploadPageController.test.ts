import {
  ComponentType,
  type ComponentDef,
  type FormDefinition,
  type Page
} from '@defra/forms-model'

import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'

describe('FileUploadPageController', () => {
  const component1: ComponentDef = {
    name: 'guidance',
    content: '<b>Guidance<b>',
    title: 'Guidance',
    type: ComponentType.Html,
    options: {},
    schema: {}
  }

  const component2: ComponentDef = {
    name: 'fileUpload',
    title: 'Methodology statement',
    type: ComponentType.FileUploadField,
    options: {},
    schema: {
      min: 1,
      max: 2
    }
  }

  let page: Page
  let definition: FormDefinition
  let formModel: FormModel
  let controller: FileUploadPageController

  beforeEach(() => {
    page = {
      path: '/first-page',
      title: 'Upload files',
      components: [component1, component2]
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

    controller = new FileUploadPageController(formModel, page)
  })

  describe('Constructor', () => {
    it('throws unless there is exactly 1 file upload component', () => {
      expect(() => {
        new FileUploadPageController(formModel, {
          path: '/first-page',
          title: 'Upload files',
          components: [component1]
        })
      }).toThrow(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${page.path}'`
      )
    })

    it('throws unless file upload component is the first in the form', () => {
      const textComponent: ComponentDef = {
        name: 'fullName',
        title: 'Full name',
        type: ComponentType.TextField,
        options: {},
        schema: {}
      }

      expect(() => {
        new FileUploadPageController(formModel, {
          path: '/first-page',
          title: 'Upload files',
          components: [textComponent, component2]
        })
      }).toThrow(
        `Expected '${component2.name}' to be the first form component in FileUploadPageController '${page.path}'`
      )
    })
  })

  describe('Form validation', () => {
    it('includes title text and error', () => {
      const result = controller.validateForm({})

      expect(result.errors).toEqual(
        expect.objectContaining({
          titleText: 'There is a problem',
          errorList: [
            {
              path: 'fileUpload',
              href: '#fileUpload',
              name: 'fileUpload',
              text: 'Select methodology statement'
            }
          ]
        })
      )
    })

    it('includes all field errors', () => {
      const result = controller.validateForm({})
      expect(result.errors?.errorList).toHaveLength(1)
    })
  })
})
