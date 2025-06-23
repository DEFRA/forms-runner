/**
 * Factory method for list Item
 * @param {Partial<Item>} partialListItem
 * @returns {Item}
 */
export function createListItemFactory(partialListItem) {
  return {
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
