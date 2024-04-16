import type { Server } from '@hapi/hapi'

type QueueResponse = [number | string, string | undefined]

export abstract class QueueService {
  logger: Server['logger']

  constructor(server: Server) {
    this.logger = server.logger
  }

  /**
   * Send data from form submission to submission queue
   * @param data
   * @param url
   * @param allowRetry
   * @returns The ID of the newly added row, or undefined in the event of an error
   */
  abstract sendToQueue(
    data: object,
    url: string,
    allowRetry?: boolean
  ): Promise<QueueResponse>

  abstract getReturnRef(rowId: number | string): Promise<string | null>
}
