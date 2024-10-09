import { type List } from '@defra/forms-model'

export const listNumber = {
  title: 'Example number list',
  name: 'listNumber',
  type: 'number',
  items: [
    { text: '1 point', value: 1 },
    { text: '2 points', value: 2 },
    { text: '3 points', value: 3 },
    { text: '4 points', value: 4 }
  ]
} satisfies List

export const listNumberExamples = [
  {
    text: '1 point',
    value: 1,
    state: 1
  },
  {
    text: '2 points',
    value: 2,
    state: 2
  },
  {
    text: '3 points',
    value: 3,
    state: 3
  },
  {
    text: '4 points',
    value: 4,
    state: 4
  }
]

export const listString = {
  title: 'Example string list',
  name: 'listString',
  type: 'string',
  items: [
    { text: '1 hour', value: '1' },
    { text: '2 hours', value: '2' },
    { text: '3 hours', value: '3' },
    { text: '4 hours', value: '4' }
  ]
} satisfies List

export const listStringExamples = [
  {
    text: '1 hour',
    value: '1',
    state: '1'
  },
  {
    text: '2 hours',
    value: '2',
    state: '2'
  },
  {
    text: '3 hours',
    value: '3',
    state: '3'
  },
  {
    text: '4 hours',
    value: '4',
    state: '4'
  }
]

export const listYesNoExamples = [
  {
    text: 'Yes',
    value: true,
    state: true
  },
  {
    text: 'No',
    value: false,
    state: false
  }
]
