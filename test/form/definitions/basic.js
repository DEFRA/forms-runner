import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

import {
  createListFromFactory,
  createListItemFactory
} from '~/test/form/factory.js'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Basic',
  startPage: '/licence',
  pages: /** @type {const} */ ([
    {
      title: 'Buy a rod fishing licence',
      path: '/licence',
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
  ]),
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
    createListFromFactory({
      name: 'licenceLengthDays',
      title: 'Licence length (days)',
      type: 'number',
      items: [
        createListItemFactory({
          id: '52fc51fc-c75a-4b08-9c9e-6bd99b9bc49b',
          text: '1 day',
          value: 1,
          description: 'Valid for 24 hours from the start time that you select'
        }),
        createListItemFactory({
          id: '56b7b34f-23b3-4446-ac8e-b2443d18588e',
          text: '8 day',
          value: 8,
          description:
            'Valid for 8 consecutive days from the start time that you select'
        }),
        createListItemFactory({
          id: '1af54fbc-eec2-4e1e-bd53-2415abf62677',
          text: '12 months',
          value: 365,
          description:
            '12-month licences are now valid for 365 days from their start date and can be purchased at any time during the year'
        })
      ]
    })
  ],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
