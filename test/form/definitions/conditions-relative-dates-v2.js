import {
  ComponentType,
  ConditionType,
  ControllerType,
  DateDirections,
  DateUnits,
  Engine,
  OperatorName,
  SchemaVersion
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Conditions testing date parts',
  engine: Engine.V2,
  schema: SchemaVersion.V2,
  startPage: '/summary',
  pages: [
    {
      title: 'page 1',
      path: '/when-is-your-birthday',
      components: [
        {
          type: ComponentType.DatePartsField,
          title: 'When is your birthday?',
          name: 'ybMHIv',
          shortDescription: 'When is birthday?',
          hint: '',
          options: {
            required: true
          },
          id: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9'
        }
      ],
      next: [],
      id: 'a0ee9809-5f39-4e4e-92c3-ca047a93531e'
    },
    {
      title: 'page 2',
      path: '/is-at-least-2-years-in-the-past',
      components: [
        {
          type: ComponentType.TextField,
          title: 'Is at least 2 years in the past',
          name: 'oIeksl',
          shortDescription: 'Is at least 2 years in the past',
          hint: '',
          options: {
            required: true
          },
          schema: {},
          id: '0f3b8f4d-d0e2-4d31-9a22-ce4490f52912'
        }
      ],
      next: [],
      id: '55e6683d-20ac-4a8b-a114-e49a6186b4c3',
      condition: 'b16ea63f-78e8-48d3-980c-84703f669cbb'
    },
    {
      title: 'page 3',
      path: '/is-at-most-2-years-in-the-past',
      components: [
        {
          type: ComponentType.TextField,
          title: 'Is at most 2 years in the past',
          name: 'TmZcId',
          shortDescription: 'Is at most 2 years in the past',
          hint: '',
          options: {
            required: true
          },
          schema: {},
          id: 'f74414e1-538c-4c56-a2ef-e52197805a3a'
        }
      ],
      next: [],
      id: '65bb24d5-a57f-4bbf-81cd-d10557cf663a',
      condition: 'c001d036-bc69-48bc-9afe-9b343130d432'
    },
    {
      title: 'page 4',
      path: '/is-less-than-2-years-in-the-past',
      components: [
        {
          type: ComponentType.TextField,
          title: 'Is less than 2 years in the past',
          name: 'MgrNEz',
          shortDescription: 'Is less than 2 years in the past',
          hint: '',
          options: {
            required: true
          },
          schema: {},
          id: 'd6b3a398-5482-4645-bc6c-3ee3c5c110d6'
        }
      ],
      next: [],
      id: 'f98b2158-9a2a-418c-83cc-f11e83e41644',
      condition: '0910a1d5-7a1c-4bfa-8206-ba84823b291b'
    },
    {
      title: 'page 5',
      path: '/is-more-than-2-years-in-the-past',
      components: [
        {
          type: ComponentType.TextField,
          title: 'Is more than 2 years in the past',
          name: 'LWbrqm',
          shortDescription: 'Is more than 2 years in the past',
          hint: '',
          options: {
            required: true
          },
          schema: {},
          id: '42883b9e-a9d0-4698-9755-24be156aa4ba'
        }
      ],
      next: [],
      id: '0a525566-b484-4dce-86e3-3fd5b824ff02',
      condition: '581e72cc-8ee3-4bf1-80d2-b9a905724210'
    },
    {
      title: 'Summary',
      path: '/summary',
      controller: ControllerType.Summary,
      components: [],
      id: 'a32d9d86-5428-44cd-9c8e-e4df9e72c757'
    }
  ],
  conditions: [
    {
      items: [
        {
          id: 'ab17d589-2c7a-48a2-8389-f3d0b6e6c806',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.Is,
          type: ConditionType.StringValue,
          value: '2025-01-01'
        }
      ],
      displayName: 'Is 2025-01-01 (absolute)',
      id: '00f18bdc-b4bb-4e81-bd32-1f453c0dca82'
    },
    {
      items: [
        {
          id: '8126463a-4f4c-45fe-90a3-204840f73914',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.IsNot,
          type: ConditionType.StringValue,
          value: '2025-01-01'
        }
      ],
      displayName: 'Is not 2025-01-01 (absolute)',
      id: '597a32ea-d4d5-4d9f-97ea-7244def206ec'
    },
    {
      items: [
        {
          id: '4a20782e-1419-4158-abce-7ca7c63e43eb',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.IsBefore,
          type: ConditionType.StringValue,
          value: '2025-01-01'
        }
      ],
      displayName: 'Is before 2025-01-01 (absolute)',
      id: '3f1d5a7a-14f7-418e-9a45-44d9a9782de9'
    },
    {
      items: [
        {
          id: '7b202392-9219-45e8-9105-fcc2c78bbef4',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.IsAfter,
          type: ConditionType.StringValue,
          value: '2025-01-01'
        }
      ],
      displayName: 'Is after 2025-01-01 (absolute)',
      id: '71e29fdd-9993-46e5-ba9d-028c69ceeca8'
    },
    {
      items: [
        {
          id: '63f5ebed-4713-4564-81dc-1d0d56e9b4df',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.IsAtLeast,
          type: ConditionType.RelativeDate,
          value: {
            period: 2,
            unit: DateUnits.YEARS,
            direction: DateDirections.PAST
          }
        }
      ],
      displayName: 'Is at least 2 year in the past',
      id: 'b16ea63f-78e8-48d3-980c-84703f669cbb'
    },
    {
      items: [
        {
          id: '79edca03-14fa-49d4-81d6-e324e6f213d6',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.IsAtMost,
          type: ConditionType.RelativeDate,
          value: {
            period: 2,
            unit: DateUnits.YEARS,
            direction: DateDirections.PAST
          }
        }
      ],
      displayName: 'Is at most 2 year in the past',
      id: 'c001d036-bc69-48bc-9afe-9b343130d432'
    },
    {
      items: [
        {
          id: '7f6e8e5a-4b3e-4c48-8da0-5a6270436802',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.IsLessThan,
          type: ConditionType.RelativeDate,
          value: {
            period: 2,
            unit: DateUnits.YEARS,
            direction: DateDirections.PAST
          }
        }
      ],
      displayName: 'Is less than 2 year in the past',
      id: '0910a1d5-7a1c-4bfa-8206-ba84823b291b'
    },
    {
      items: [
        {
          id: '1fad735f-8c9e-49fa-8c9e-2fd19a0ed75a',
          componentId: '34567ef1-49df-46fb-b0ed-2e0922c2b0d9',
          operator: OperatorName.IsMoreThan,
          type: ConditionType.RelativeDate,
          value: {
            period: 2,
            unit: DateUnits.YEARS,
            direction: DateDirections.PAST
          }
        }
      ],
      displayName: 'Is more than 2 year in the past',
      id: '581e72cc-8ee3-4bf1-80d2-b9a905724210'
    }
  ],
  sections: [
    {
      name: 'section',
      title: 'Section title',
      hideTitle: false
    }
  ],
  lists: []
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
