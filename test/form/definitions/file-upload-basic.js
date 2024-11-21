import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'File upload basic',
  startPage: '/file-upload-component',
  pages: [
    {
      path: '/file-upload-component',
      title: 'File upload component',
      controller: ControllerType.FileUpload,
      components: [
        {
          type: ComponentType.FileUploadField,
          name: 'fileUpload',
          title: 'Upload something',
          options: {},
          schema: {}
        }
      ],
      next: [
        {
          path: '/summary'
        }
      ]
    },
    {
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Summary'
    }
  ],
  lists: [],
  sections: [],
  conditions: [],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
