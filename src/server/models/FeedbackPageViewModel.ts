import { type FormPageViewModel } from '@defra/forms-engine-plugin/types'

/**
 * Extends {@link FormPageViewModel} with template variables specific to the feedback page.
 */
export interface FeedbackPageViewModel extends FormPageViewModel {
  hidePhaseBanner?: boolean
  submitButtonText: string
}
