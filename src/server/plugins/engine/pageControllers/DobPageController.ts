import { type Page } from '@defra/forms-model'
import joi from 'joi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type FormPayload } from '~/src/server/plugins/engine/types.js'

/**
 * DobPageController adds to the state a users ageGroup
 * @deprecated FCDO and HO do not use this controller. No guarantee this will work!
 */
export class DobPageController extends PageController {
  constructor(model: FormModel, pageDef: Page) {
    super(model, pageDef)

    this.stateSchema = this.stateSchema.append({
      ageGroup: joi.string().required().valid('junior', 'full', 'senior')
    })
  }

  getStateFromValidForm(formData: FormPayload) {
    const state = super.getStateFromValidForm(formData)
    const age = Math.floor((Date.now() - state.dob) / 31557600000)

    state.ageGroup = age < 13 ? 'junior' : age > 65 ? 'senior' : 'full'

    return state
  }
}
