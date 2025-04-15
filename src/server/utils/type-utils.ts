import Joi, {
  type JoiExpression,
  type LanguageMessages,
  type LanguageMessagesExt
} from 'joi'

export function convertToLanguageMessages(
  extLanguageMessages: LanguageMessagesExt
): LanguageMessages {
  return extLanguageMessages as unknown as LanguageMessages
}

export function createJoiExpression(expr: string): JoiExpression {
  return Joi.expression(expr) as unknown as JoiExpression
}
