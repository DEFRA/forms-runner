/**
 * Factory method for list Item
 * @param {Partial<Item>} partialListItem
 * @returns {Item}
 */
export function createListItemFactory(partialListItem) {
  return {
    id: '52fc51fc-c75a-4b08-9c9e-6bd99b9bc49b',
    text: 'text',
    value: 1,
    description: 'Valid for 24 hours from the start time that you select',
    ...partialListItem
  }
}

/**
 * Factory method for List
 * @param {Partial<List>} partialList
 * @returns {List}
 */
export function createListFromFactory(partialList) {
  return {
    id: '4ebe4ef5-bd3c-499b-a179-7e7e86b0dc6f',
    name: 'licenceLengthDays',
    title: 'Licence length (days)',
    type: 'number',
    items: [],
    ...partialList
  }
}

/**
 * @import { Item, List } from '@defra/forms-model'
 */
