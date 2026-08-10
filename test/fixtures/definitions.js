/**
 * Broken form definitions for error-page tests. Each builder returns a fresh
 * object, so tests can mutate their copy freely without affecting each other.
 * Mirrors the engine plugin's `__stubs__/definitions.ts`.
 */

const USER_TYPE_LIST_ID = '4fa26e9c-07cf-47cd-a9dd-5cec0dd3f544'
const YES_NO_COMPONENT_ID = 'a7c0242f-2a31-45b2-8c71-ff2ac7f53288'
const EXISTING_USER_ITEM_ID = '55fe0067-d011-4d33-886c-e1aa266637c3'

/**
 * A minimal, schema-valid V2 definition: one YesNo question page and a
 * summary page.
 * @returns {FormDefinition}
 */
export function buildDefinition() {
  return /** @type {FormDefinition} */ (
    /** @type {unknown} */ ({
      name: 'Stub definition',
      engine: 'V2',
      schema: 2,
      startPage: '/summary',
      pages: [
        {
          id: '449c053b-9201-4312-9a75-187afc6ba48b',
          path: '/licence',
          title: 'Licence',
          components: [
            {
              id: YES_NO_COMPONENT_ID,
              name: 'xVrYaJ',
              type: 'YesNoField',
              title: 'Do you have a licence?',
              shortDescription: 'Licence',
              options: { required: true },
              schema: {}
            }
          ],
          next: []
        },
        {
          id: '449c053b-9201-4312-9a75-187afc6ba48c',
          path: '/summary',
          title: 'Summary',
          controller: 'SummaryPageController',
          components: [],
          next: []
        }
      ],
      lists: [],
      sections: [],
      conditions: []
    })
  )
}

/**
 * Passes schema validation but cannot be used by the engine: a ListItemRef
 * condition points at the YesNoField (boolean), so the condition cannot be
 * built. Distilled from a real production incident.
 * @returns {FormDefinition}
 */
export function buildBrokenConditionDefinition() {
  const definition = buildDefinition()

  definition.name = 'Broken condition fixture'

  const questionPage = /** @type {PageQuestion} */ (definition.pages[0])
  // A YesNoField cannot legitimately carry a custom list — that is the
  // corruption this fixture models — so the types have no `list` property
  // here and a cast is required.
  const component = /** @type {{ list?: string }} */ (
    questionPage.components[0]
  )
  component.list = USER_TYPE_LIST_ID
  definition.lists = [
    {
      id: USER_TYPE_LIST_ID,
      name: 'XtfRYR',
      title: 'User type list',
      type: 'string',
      items: [
        {
          id: EXISTING_USER_ITEM_ID,
          text: 'existing user',
          value: 'existing user'
        },
        {
          id: '2277c7e5-7fef-46c6-993b-d294116d6d6b',
          text: 'new user',
          value: 'new user'
        }
      ]
    }
  ]
  definition.conditions = [
    {
      id: '3f9d3a35-6dee-4706-806c-3f776129f631',
      displayName: 'Existing user',
      items: [
        {
          id: '7d7f58ee-c860-4d24-8a13-de5cb9af53d8',
          componentId: YES_NO_COMPONENT_ID,
          operator: /** @type {OperatorName} */ ('is'),
          type: /** @type {ConditionType} */ ('ListItemRef'),
          value: {
            listId: USER_TYPE_LIST_ID,
            itemId: [EXISTING_USER_ITEM_ID]
          }
        }
      ]
    }
  ]

  return definition
}

/**
 * Schema-valid, but the first page names a controller that does not exist.
 * @returns {FormDefinition}
 */
export function buildUnknownControllerDefinition() {
  const definition = buildDefinition()

  definition.name = 'Unknown controller fixture'
  definition.pages[0].controller = /** @type {ControllerType} */ (
    'NoSuchPageController'
  )

  return definition
}

/**
 * Schema-valid (component types are free strings in the schema), but the
 * question uses a type the engine has no component class for.
 * @returns {FormDefinition}
 */
export function buildUnknownComponentDefinition() {
  const definition = buildDefinition()

  definition.name = 'Unknown component fixture'
  const questionPage = /** @type {PageQuestion} */ (definition.pages[0])
  questionPage.components[0].type = /** @type {ComponentType} */ (
    'MyUnknownField'
  )

  return definition
}

/**
 * Fails schema validation: the question page appears twice, violating the
 * pages uniqueness rules.
 * @returns {FormDefinition}
 */
export function buildSchemaInvalidDefinition() {
  const definition = buildDefinition()

  definition.name = 'Schema invalid fixture'
  definition.pages.push(buildDefinition().pages[0])

  return definition
}

/**
 * @import { ComponentType, ConditionType, ControllerType, FormDefinition, OperatorName, PageQuestion } from '@defra/forms-model'
 */
