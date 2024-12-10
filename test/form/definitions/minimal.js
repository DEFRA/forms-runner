import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Minimal',
  startPage: '/start',
  pages: [
    {
      title: 'Optional field',
      path: '/start',
      components: [
        {
          type: ComponentType.TextField,
          name: 'field',
          title: 'Optional field',
          options: {},
          schema: {}
        }
      ],
      next: [{ path: '/summary' }]
    },
    {
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Summary'
    }
  ],
  sections: [],
  conditions: [],
  lists: [],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
