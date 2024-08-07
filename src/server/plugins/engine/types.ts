/**
 * Form submission state stores the following in Redis:
 * 1. progress[]: which indicates the urls the user have already submitted.
 * 2. Other props containing user's submitted values as `{ [inputId]: value }` or as `{ [sectionName]: { [inputName]: value } }`
 *   a) . e.g:
 * ```ts
 *     {
 *       progress: [
 *         '/gZovGvanSq/student-visa-application?visit=HxCva29Xhd',
 *         '/gZovGvanSq/what-are-you-going-to-study?visit=HxCva29Xhd'
 *       ],
 *       _C9PRHmsgt: 'Ben',
 *       WfLk9McjzX: 'Music',
 *       IK7jkUFCBL: 'Royal Academy of Music'
 *     }
 * ```
 *
 *   b)
 * ```ts
 *   {
 *         progress: [
 *           '/gZovGvanSq/uk-passport?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/how-many-people?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/applicant-one?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/applicant-one-address?visit=pQ1LIzb5kE',
 *           '/gZovGvanSq/contact-details?visit=pQ1LIzb5kE'
 *         ],
 *         checkBeforeYouStart: { ukPassport: true },
 *         applicantDetails: {
 *           numberOfApplicants: 1,
 *           phoneNumber: '77777777',
 *           emailAddress: 'aaa@aaa.com'
 *         },
 *         applicantOneDetails: {
 *           firstName: 'a',
 *           middleName: 'a',
 *           lastName: 'a',
 *           address: { addressLine1: 'a', addressLine2: 'a', town: 'a', postcode: 'a' }
 *         }
 *     }
 * ```
 */
export type FormSubmissionState<
  FieldType extends Record<
    string,
    FormStateValue | undefined
  > = FormSubmissionStateDefaults
> = Partial<FieldType>

/**
 * Form submission state (defaults)
 */
export interface FormSubmissionStateDefaults
  extends Record<string, FormStateValue | undefined> {
  /**
   * URL paths the user has already submitted
   */
  progress?: string[]
}

export type FormStateValue = FormSchemaValue | Record<string, string> | null

export type FormSchemaValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | undefined

export interface FormSubmissionErrors {
  titleText: string // e.b: "There is a problem"
  errorList: {
    path: string // e.g: "firstName"
    href: string // e.g: "#firstName"
    name: string // e.g: "firstName"
    text: string // e.g: '"First name" is not allowed to be empty'
  }[]
}

/**
 * Form POST for question pages
 * (after Joi has converted value types)
 */
export type FormPayload<
  FieldType extends Record<
    string,
    FormSchemaValue | undefined
  > = FormPayloadDefaults
> = Partial<FieldType>

/**
 * Form POST for question pages (defaults)
 */
export interface FormPayloadDefaults
  extends Record<string, FormSchemaValue | undefined> {
  /**
   * Crumb plugin (CSRF protection) generated ID from hidden form input
   */
  crumb: string
}

export type FormData = Omit<FormPayload, 'crumb'>

export interface FormValidationResult<ValueType extends object = FormPayload> {
  value?: ValueType
  errors?: FormSubmissionErrors | null
}
