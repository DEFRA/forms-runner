import {
  createListFromFactory,
  createListItemFactory
} from '~/test/form/factory.js'

/**
 * @satisfies {List}
 */
export const listNumber = createListFromFactory({
  title: 'Example number list',
  name: 'listNumber',
  type: 'number',
  items: [
    createListItemFactory({ text: '1 point', value: 1 }),
    createListItemFactory({ text: '2 points', value: 2 }),
    createListItemFactory({ text: '3 points', value: 3 }),
    createListItemFactory({ text: '4 points', value: 4 })
  ]
})

export const listNumberExamples = [
  createListItemFactory({
    text: '1 point',
    value: 1
  }),
  createListItemFactory({
    text: '2 points',
    value: 2
  }),
  createListItemFactory({
    text: '3 points',
    value: 3
  }),
  createListItemFactory({
    text: '4 points',
    value: 4
  })
]

/**
 * @satisfies {List}
 */
export const listString = createListFromFactory({
  title: 'Example string list',
  name: 'listString',
  type: 'string',
  items: [
    createListItemFactory({ text: '1 hour', value: '1' }),
    createListItemFactory({ text: '2 hours', value: '2' }),
    createListItemFactory({ text: '3 hours', value: '3' }),
    createListItemFactory({ text: '4 hours', value: '4' })
  ]
})

export const listStringExamples = [
  createListItemFactory({
    text: '1 hour',
    value: '1'
  }),
  createListItemFactory({
    text: '2 hours',
    value: '2'
  }),
  createListItemFactory({
    text: '3 hours',
    value: '3'
  }),
  createListItemFactory({
    text: '4 hours',
    value: '4'
  })
]

export const listYesNoExamples = [
  createListItemFactory({
    text: 'Yes',
    value: true
  }),
  createListItemFactory({
    text: 'No',
    value: false
  })
]

/**
 * @import { List } from '@defra/forms-model'
 */
