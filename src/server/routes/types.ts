import { type ReqRefDefaults, type Request } from '@hapi/hapi'

import { type FormPayload } from '~/src/server/plugins/engine/types.js'

export interface FormQuery extends Partial<Record<string, string>> {
  returnUrl?: string
}

export interface FormParams extends Partial<Record<string, string>> {
  path: string
  slug: string
  state?: FormStatus
}

export interface FormRequestRefs
  extends Omit<ReqRefDefaults, 'Params' | 'Payload' | 'Query'> {
  Params: FormParams
  Payload: object
  Query: FormQuery
}

export interface FormRequestPayloadRefs extends FormRequestRefs {
  Payload: {
    action?: string
    confirm?: boolean
    itemId?: string
    crumb?: string
  } & FormPayload
}

export type FormRequest = Request<FormRequestRefs>
export type FormRequestPayload = Request<FormRequestPayloadRefs>

export enum FormStatus {
  Draft = 'draft',
  Live = 'live'
}
