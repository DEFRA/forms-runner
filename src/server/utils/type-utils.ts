import { type LanguageMessages, type LanguageMessagesExt } from 'joi'

export function convertToLanguageMessages(
  extLanguageMessages: LanguageMessagesExt
): LanguageMessages {
  return extLanguageMessages as unknown as LanguageMessages
}
