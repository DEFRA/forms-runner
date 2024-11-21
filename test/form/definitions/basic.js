import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Basic',
  startPage: '/start',
  pages: [
    {
      title: 'Buy a rod fishing licence',
      path: '/start',
      components: [
        {
          options: {
            bold: true
          },
          type: ComponentType.RadiosField,
          name: 'licenceLength',
          title: 'Which fishing licence do you want to get?',
          list: 'licenceLengthDays'
        }
      ],
      section: 'licenceDetails',
      next: [
        {
          path: '/full-name'
        }
      ]
    },
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
      section: 'personalDetails',
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
      name: 'licenceDetails',
      title: 'Licence details'
    },
    {
      name: 'personalDetails',
      title: 'Personal details'
    }
  ],
  conditions: [],
  lists: [
    {
      name: 'licenceLengthDays',
      title: 'Licence length (days)',
      type: 'number',
      items: [
        {
          text: '1 day',
          value: 1,
          description: 'Valid for 24 hours from the start time that you select'
        },
        {
          text: '8 day',
          value: 8,
          description:
            'Valid for 8 consecutive days from the start time that you select'
        },
        {
          text: '12 months',
          value: 365,
          description:
            '12-month licences are now valid for 365 days from their start date and can be purchased at any time during the year'
        }
      ]
    }
  ],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
