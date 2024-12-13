import {
  ComponentType,
  ConditionType,
  ControllerPath,
  ControllerType,
  OperatorName
} from '@defra/forms-model'

export default /** @satisfies {FormDefinition} */ ({
  name: 'Conditions complex',
  startPage: '/uk-passport',
  pages: /** @type {const} */ ([
    {
      path: '/uk-passport',
      components: [
        {
          type: ComponentType.YesNoField,
          name: 'ukPassport',
          title: 'Do you have a UK passport?',
          options: {
            required: true
          }
        }
      ],
      section: 'checkBeforeYouStart',
      next: [
        {
          path: '/how-many-people'
        },
        {
          path: '/testconditions',
          condition: 'doesntHaveUKPassport'
        }
      ],
      title: 'Do you have a UK passport?'
    },
    {
      path: '/how-many-people',
      components: [
        {
          options: {
            classes: 'govuk-input--width-10'
          },
          type: ComponentType.SelectField,
          name: 'numberOfApplicants',
          title: 'How many applicants are there?',
          list: 'numberOfApplicants'
        }
      ],
      next: [
        {
          path: '/applicant-one-name'
        }
      ],
      title: 'How many applicants are there?'
    },
    {
      path: '/applicant-one-name',
      title: 'Applicant 1',
      section: 'applicantOneDetails',
      components: [
        {
          type: ComponentType.Html,
          name: 'html',
          title: 'Html',
          content:
            '<p class="govuk-body">Provide the details as they appear on your passport.</p>',
          options: {}
        },
        {
          type: ComponentType.TextField,
          name: 'applicantOneFirstName',
          title: 'First name',
          options: {
            customValidationMessage:
              'Enter your first name as it appears on your passport',
            required: true
          },
          schema: {}
        },
        {
          options: {
            required: false,
            optionalText: false
          },
          type: ComponentType.TextField,
          name: 'applicantOneMiddleName',
          title: 'Middle name',
          hint: 'If you have a middle name on your passport you must include it here',
          schema: {}
        },
        {
          type: ComponentType.TextField,
          name: 'applicantOneLastName',
          title: 'Surname',
          options: {
            required: true
          },
          schema: {}
        }
      ],
      next: [
        {
          path: '/applicant-one-address'
        }
      ]
    },
    {
      path: '/applicant-one-address',
      section: 'applicantOneDetails',
      components: [
        {
          type: ComponentType.UkAddressField,
          name: 'applicantOneAddress',
          title: 'Address',
          options: {
            required: true
          }
        }
      ],
      next: [
        {
          path: '/applicant-two',
          condition: 'moreThanOneApplicant'
        },
        {
          path: '/testconditions'
        }
      ],
      title: 'Address'
    },
    {
      path: '/applicant-two',
      title: 'Applicant 2',
      section: 'applicantTwoDetails',
      components: [
        {
          type: ComponentType.Html,
          name: 'html',
          title: 'Html',
          content:
            '<p class="govuk-body">Provide the details as they appear on your passport.</p>',
          options: {}
        },
        {
          type: ComponentType.TextField,
          name: 'applicantTwoFirstName',
          title: 'First name',
          options: {
            required: true
          },
          schema: {}
        },
        {
          options: {
            required: false,
            optionalText: false
          },
          type: ComponentType.TextField,
          name: 'applicantTwoMiddleName',
          title: 'Middle name',
          hint: 'If you have a middle name on your passport you must include it here',
          schema: {}
        },
        {
          type: ComponentType.TextField,
          name: 'applicantTwoLastName',
          title: 'Surname',
          options: {
            required: true
          },
          schema: {}
        }
      ],
      next: [
        {
          path: '/applicant-two-address'
        }
      ]
    },
    {
      path: '/applicant-two-address',
      section: 'applicantTwoDetails',
      components: [
        {
          type: ComponentType.UkAddressField,
          name: 'applicantTwoAddress',
          title: 'Address',
          options: {
            required: true
          }
        }
      ],
      next: [
        {
          path: '/testconditions'
        }
      ],
      title: 'Address'
    },
    {
      path: ControllerPath.Summary,
      controller: ControllerType.Summary,
      title: 'Summary'
    },
    {
      path: '/testconditions',
      title: 'TestConditions',
      components: [
        {
          name: 'pmmRYP',
          title: 'Html',
          options: {
            condition: 'bDDfgf'
          },
          type: ComponentType.Html,
          content: '<p class="govuk-body">There Is Someone Called Applicant</p>'
        }
      ],
      next: [
        {
          path: '/summary'
        }
      ]
    }
  ]),
  lists: [
    {
      name: 'numberOfApplicants',
      title: 'Number of people',
      type: 'number',
      items: [
        {
          text: '1',
          value: 1,
          description: '',
          condition: ''
        },
        {
          text: '2',
          value: 2,
          description: '',
          condition: ''
        }
      ]
    }
  ],
  sections: [
    {
      name: 'checkBeforeYouStart',
      title: 'Check before you start'
    },
    {
      name: 'applicantOneDetails',
      title: 'Applicant 1'
    },
    {
      name: 'applicantTwoDetails',
      title: 'Applicant 2'
    }
  ],
  phaseBanner: {},
  declaration:
    '<p class="govuk-body">All the answers you have provided are true to the best of your knowledge.</p>',
  conditions: [
    {
      name: 'hasUKPassport',
      displayName: 'hasUKPassport',
      value: {
        name: 'hasUKPassport',
        conditions: [
          {
            field: {
              name: 'ukPassport',
              type: ComponentType.YesNoField,
              display: 'Do you have a UK passport?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'true',
              display: 'true'
            }
          }
        ]
      }
    },
    {
      name: 'doesntHaveUKPassport',
      displayName: 'doesntHaveUKPassport',
      value: {
        name: 'doesntHaveUKPassport',
        conditions: [
          {
            field: {
              name: 'ukPassport',
              type: ComponentType.YesNoField,
              display: 'Do you have a UK passport?'
            },
            operator: OperatorName.Is,
            value: {
              type: ConditionType.Value,
              value: 'false',
              display: 'false'
            }
          }
        ]
      }
    },
    {
      name: 'moreThanOneApplicant',
      displayName: 'moreThanOneApplicant',
      value: {
        name: 'moreThanOneApplicant',
        conditions: [
          {
            field: {
              name: 'numberOfApplicants',
              type: ComponentType.SelectField,
              display: 'How many applicants are there?'
            },
            operator: OperatorName.IsMoreThan,
            value: {
              type: ConditionType.Value,
              value: '1',
              display: '1'
            }
          }
        ]
      }
    }
  ],
  outputEmail: 'enrique.chase@defra.gov.uk'
})

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
