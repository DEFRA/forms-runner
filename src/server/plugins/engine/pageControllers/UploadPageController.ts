import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { type FormComponent } from '~/src/server/plugins/engine/components/index.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { PlaybackUploadPageController } from '~/src/server/plugins/engine/pageControllers/PlaybackUploadPageController.js'

function isUploadField(component: FormComponent) {
  return component.type === 'FileUploadField'
}

export class UploadPageController extends PageController {
  playback: PlaybackUploadPageController
  inputComponent: FormComponent
  constructor(model: FormModel, pageDef: any) {
    super(model, pageDef)
    const inputComponent = this.components?.items?.find(isUploadField)
    if (!inputComponent) {
      throw Error(
        'UploadPageController initialisation failed, no file upload component was found'
      )
    }
    this.playback = new PlaybackUploadPageController(
      model,
      pageDef,
      inputComponent as FormComponent
    )
    this.inputComponent = inputComponent as FormComponent
  }

  makeGetRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      const { query } = request
      const { view } = query

      if (view === 'playback') {
        return this.playback.makeGetRouteHandler()(request, h)
      }

      return super.makeGetRouteHandler()(request, h)
    }
  }

  makePostRouteHandler() {
    return async (request: Request, h: ResponseToolkit) => {
      const { query } = request

      if (query?.view === 'playback') {
        return this.playback.makePostRouteHandler()(request, h)
      }

      const defaultRes = super.makePostRouteHandler()(request, h)

      if (request.pre?.warning) {
        return h.redirect('?view=playback')
      }

      return defaultRes
    }
  }
}
