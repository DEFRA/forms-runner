import {
  ComponentType,
  ControllerPath,
  ControllerType
} from '@defra/forms-model'

const now = new Date()

/**
 * @satisfies {FormMetadataAuthor}
 */
export const author = {
  id: 'J6PlucvwkmNlYxX9HnSEj27AcJAVx_08IvZ-IPNTvAN',
  displayName: 'Enrique Chase'
}

/**
 * @satisfies {FormMetadataState}
 */
export const state = {
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}

/**
 * @satisfies {FormMetadata}
 */
export const metadata = {
  id: '661e4ca5039739ef2902b214',
  slug: 'test-form',
  title: 'Test form',
  organisation: 'Defra',
  teamName: 'Defra Forms',
  teamEmail: 'defraforms@defra.gov.uk',
  createdAt: now,
  createdBy: author,
  updatedAt: now,
  updatedBy: author
}

/**
 * @satisfies {FormDefinition}
 */
export const definition = {
  name: '',
  startPage: '/page-one',
  pages: [
    {
      path: '/page-one',
      title: 'Page one',
      section: 'section',
      components: [
        {
          type: ComponentType.TextField,
          name: 'textField',
          title: 'This is your first field',
          hint: 'Help text',
          options: {},
          schema: {}
        }
      ],
      next: [{ path: ControllerPath.Summary }]
    },
    {
      title: 'Summary',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary
    }
  ],
  sections: [
    {
      name: 'section',
      title: 'Section title',
      hideTitle: false
    }
  ],
  conditions: [],
  lists: [],
  outputEmail: 'enrique.chase@defra.gov.uk'
}

export const componentId = '1491981d-99cd-485e-ab4a-f88275edeadc'

/**
 * @satisfies {FormDefinition}
 */
export const definitionWithComponentId = {
  name: '',
  startPage: '/page-one',
  pages: [
    {
      path: '/page-one',
      title: 'Page one',
      section: 'section',
      components: [
        {
          id: componentId,
          type: ComponentType.TextField,
          name: 'textField',
          title: 'This is your first field',
          hint: 'Help text',
          options: {},
          schema: {}
        }
      ],
      next: [{ path: ControllerPath.Summary }]
    },
    {
      title: 'Summary',
      path: ControllerPath.Summary,
      controller: ControllerType.Summary
    }
  ],
  sections: [
    {
      name: 'section',
      title: 'Section title',
      hideTitle: false
    }
  ],
  conditions: [],
  lists: [],
  outputEmail: 'enrique.chase@defra.gov.uk'
}

/**
 * @import { FormDefinition, FormMetadata, FormMetadataAuthor, FormMetadataState } from '@defra/forms-model'
 */
