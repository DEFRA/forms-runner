import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'File upload',
  startPage: '/methodology-statement',
  pages: [
    {
      path: '/methodology-statement',
      title: 'Upload your methodology statement',
      section: 'section',
      controller: ControllerType.FileUpload,
      components: [
        {
          name: 'html',
          title: 'Html',
          type: ComponentType.Html,
          content: '<p class="govuk-body">\nLorem ipsum dolor sit amet</p>',
          options: {}
        },
        {
          name: 'fileUpload',
          type: ComponentType.FileUploadField,
          hint: 'Upload 2 copies of your methodology statement in Word, PDF or JPEG. The maximum file size for each file is 100MB',
          title: 'Upload your methodology statement',
          options: {
            required: false,
            accept:
              'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/vnd.oasis.opendocument.text,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/rtf,text/plain,application/pdf,image/jpeg,image/png'
          },
          schema: {
            min: 2,
            max: 4
          }
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
  sections: [
    {
      name: 'section',
      title: 'Section title',
      hideTitle: false
    }
  ],
  conditions: [],
  lists: [],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
