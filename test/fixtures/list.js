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

/**
 * @satisfies {List}
 */
export const listNumberV2 = createListFromFactory({
  id: '2ced46f0-7873-4e9f-8a21-24a3ee9f900b',
  title: 'Example number list',
  name: 'listNumber',
  type: 'number',
  items: [
    createListItemFactory({
      text: '1 point',
      value: 1,
      id: '63ca0cb4-fd93-4c40-bb6b-5869f2d0c7f9'
    }),
    createListItemFactory({
      text: '2 points',
      value: 2,
      id: 'd57edfb4-3c1e-4cf5-9911-641fb69a9ec3'
    }),
    createListItemFactory({
      text: '3 points',
      value: 3,
      id: '20b10fe8-50ce-42b7-a4f0-57777f41b5af'
    }),
    createListItemFactory({
      text: '4 points',
      value: 4,
      id: 'fda1badd-947a-444b-b8bf-4fb1d3821ae2'
    })
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

/**
 * @satisfies {List}
 */
export const listStringV2 = createListFromFactory({
  id: '2fbc3504-fd97-4bbd-98e5-7b969d2ebd56',
  title: 'Example string list',
  name: 'listString',
  type: 'string',
  items: [
    createListItemFactory({
      text: '1 hour',
      value: '1',
      id: '83a15379-3cb5-467f-ae91-f0d5d06ea654'
    }),
    createListItemFactory({
      text: '2 hours',
      value: '2',
      id: 'b8de28b1-11e0-42cb-9e16-c4bf5ffb82bb'
    }),
    createListItemFactory({
      text: '3 hours',
      value: '3',
      id: '86a11527-f839-4de2-b230-fafc2a87b438'
    }),
    createListItemFactory({
      text: '4 hours',
      value: '4',
      id: '6b077971-5b75-4131-af54-1b7e908fcacc'
    })
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
