import { type SummaryViewModel } from '@defra/forms-engine-plugin/engine/models/SummaryViewModel.js'
import { type GovukField } from '@defra/forms-model'

/**
 * Extends {@link SummaryViewModel} with an optional confirmation email field
 * rendered on the summary page when the user opts in to receive a confirmation email.
 */
export interface SummaryViewModelWithEmail extends SummaryViewModel {
  userConfirmationEmailField?: GovukField
}
