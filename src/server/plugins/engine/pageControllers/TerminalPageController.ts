import { type PageTerminal } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'

import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import { type FormRequestPayload } from '~/src/server/routes/types.js'

export class TerminalPageController extends QuestionPageController {
  declare pageDef: PageTerminal

  makePostRouteHandler(): (
    request: FormRequestPayload,
    context: FormContext,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) => Promise<ResponseObject> {
    throw Boom.methodNotAllowed('POST method not allowed for terminal pages')
  }
}
