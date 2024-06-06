import { type ContentComponentsDef } from '@defra/forms-model'

export interface InitialiseSession {
  safelist: string[]
}

export interface InitialiseSessionOptions {
  callbackUrl: string
  redirectPath?: string
  message?: string
  htmlMessage?: string
  title?: string
  skipSummary?: {
    redirectUrl: string
  }
  customText: {
    title: string
    nextSteps?: false | string
  }
  components: ContentComponentsDef[]
}

export interface DecodedSessionToken {
  /**
   * Callback url to PUT data to
   */
  cb: string

  /**
   * 16 character randomised string
   */
  user: string

  /**
   * alias for formId
   */
  group: string
}
