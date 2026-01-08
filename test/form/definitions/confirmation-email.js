import {
  ComponentType,
  ControllerPath,
  ControllerType,
  Engine,
  SchemaVersion
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Confirmation email',
  startPage: '/licence',
  engine: Engine.V2,
  schema: SchemaVersion.V2,
  pages: /** @type {const} */ ([
    {
      title: "What's your name?",
      path: '/full-name',
      components: [
        {
          schema: {
            max: 70
          },
          options: {},
          type: ComponentType.TextField,
          name: 'fullName',
          title: "What's your name?"
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
      controller: ControllerType.SummaryWithConfirmationEmail,
      title: 'Summary'
    }
  ]),
  sections: [],
  conditions: [],
  lists: []
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
