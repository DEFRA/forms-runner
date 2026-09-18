import { type FormMetadata } from '@defra/forms-model'
import { type Request } from '@hapi/hapi'

import { type SaveAndExitDetails } from '~/src/server/types.js'

/** How the API says a saved record is protected. */
export type ResumeAuthType = 'citizenSignIn' | 'memorableWord'

/** What the route does next with a record. */
export type ResumeOutcome =
  | { kind: 'redirect'; location: string }
  | { kind: 'resume'; state: object; magicLinkGroupId?: string }
  | { kind: 'error' }

/** What a strategy is told about the record it is resuming. */
export interface ResumeContext {
  form: FormMetadata
  details: SaveAndExitDetails
  formId: string
  magicLinkId: string
  /** `/draft` for a preview, empty for a live form */
  slugAndState: string
}

/** How to get the saved state of one kind of record. */
export interface ResumeStrategy {
  start: (request: Request, context: ResumeContext) => Promise<ResumeOutcome>
}
