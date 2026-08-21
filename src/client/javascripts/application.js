import { initAll } from '@defra/forms-engine-plugin/shared.js'
import { initCrossServiceHeader } from '@govuk-one-login/service-header'

initAll()

// Drives the header's dropdown at small screen sizes. Without it the menus
// stay in their open state and the toggle buttons stay hidden, so the header
// still works — this makes it behave as designed rather than enabling it.
initCrossServiceHeader()
