import 'isomorphic-fetch' // or import the fetch polyfill you installed
import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider.js'

import { config } from '~/src/config/index.js'

const sharepointConfig = config.get('sharepoint')

const credential = new ClientSecretCredential(
  sharepointConfig.tenantId,
  sharepointConfig.clientId,
  sharepointConfig.clientSecret
)

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default']
})

const graphClient = Client.initWithMiddleware({ authProvider })

/**
 * Adds items to a SharePoint list
 * @param {string} siteId - id of the site
 * @param {string} listId - id of the list
 * @param {Map<string, string>} fields - record of field names and values
 */
async function addItemsByFieldName(siteId, listId, fields) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- TODO why are MS graph types not working?
  return graphClient.api(`/sites/${siteId}/lists/${listId}/items`).post({
    fields
  })
}

/**
 * Adds items to a SharePoint list
 * @param {string} siteId - id of the site
 * @param {string} listId - id of the list
 * @param {Map<string, string>} fields - record of field names and values
 */
export async function addItemsByFieldId(siteId, listId, fields) {
  const fieldIds = await getFieldIds(siteId, listId)
  const mappedFields = new Map(
    Object.entries(fields).map(([key, value]) => {
      const newKey = fieldIds.get(key)

      if (!newKey) {
        throw Error(`Field with name "${key}" doesn't exist on the list`)
      }

      return [newKey, /** @type {string} */ (value)]
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- TODO why are MS graph types not working?
  return addItemsByFieldName(siteId, listId, mappedFields)
}

/**
 * Returns the IDs for all
 * @param {string} siteId
 * @param {string} listId
 * @returns {Promise<Map<string, string>>}
 */
async function getFieldIds(siteId, listId) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- TODO why are MS graph types not working?
  const listResponse = /** @type {List} */ (
    await graphClient.api(`/sites/${siteId}/lists/${listId}`).get()
  )

  const columns = listResponse.columns ?? []

  const columnIds = /** @type {[string, string][]} */ (
    columns
      .map((item) => {
        if (item.id && item.displayName) {
          return [item.id.toString(), item.displayName.toString()]
        }

        return undefined
      })
      .filter((val) => val !== undefined)
  )

  return new Map(columnIds)
}

/** @import { List } from '@microsoft/microsoft-graph-types' */
