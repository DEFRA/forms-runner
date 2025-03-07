/**
 * @typedef {object} MacroOptions
 * @property {string} [callBlock] - Nunjucks call block content
 * @property {object} [params] - Nunjucks macro params
 */

/**
 * @typedef {object} RenderOptions
 * @property {object} [context] - Nunjucks render context
 */

/**
 * @typedef {object} ViewContext - Nunjucks view context
 * @property {string} appVersion - Application version
 * @property {string} assetPath - Asset path
 * @property {Partial<Config>} config - Application config properties
 * @property {CookieConsent} [cookieConsent] - Cookie consent preferences
 * @property {string} [crumb] - Cross-Site Request Forgery (CSRF) token
 * @property {string} [cspNonce] - Content Security Policy (CSP) nonce
 * @property {string} [currentPath] - Current path
 * @property {string} [previewMode] - Preview mode
 * @property {string} [slug] - Form slug
 * @property {(asset?: string) => string} getAssetPath - Asset path resolver
 * @property {FormContext} [context] - the current form context
 */

/**
 * @typedef {ReturnType<typeof config['getProperties']>} Config - Application config properties
 */

/**
 * @typedef NunjucksContext
 * @property {ViewContext} ctx - the current nunjucks view context
 */

/**
 * @import { CookieConsent } from '~/src/common/types.js'
 * @import { config } from '~/src/config/index.js'
 * @import { FormContext } from '~/src/server/plugins/engine/types.js'
 */
