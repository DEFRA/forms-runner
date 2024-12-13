import { Component } from 'govuk-frontend'

const cookieBannerAcceptSelector = '.js-cookie-banner-accept'
const cookieBannerRejectSelector = '.js-cookie-banner-reject'
const cookieBannerHideButtonSelector = '.js-cookie-banner-hide'
const cookieMessageSelector = '.js-cookie-banner-message'
const cookieConfirmationAcceptSelector = '.js-cookie-banner-confirmation-accept'
const cookieConfirmationRejectSelector = '.js-cookie-banner-confirmation-reject'
const cookieBannerFormSelector = '.js-cookie-banner-form'

/**
 * Website cookie banner
 *
 * Heavily inspired by https://github.com/alphagov/govuk-design-system/blob/use-config-component/src/javascripts/components/cookie-banner.mjs
 */
class CookieBannerForm extends Component {
  static moduleName = 'cookie-banner-form'
  /**
   * @param {Element} $root - HTML element
   */
  constructor($root) {
    console.log('HELLOOOOOOOOOO1')
    super($root)
    console.log('HELLOOOOOOOOOO2')

    const $cookieBannerForm = $root.querySelector(cookieBannerFormSelector)
    const $acceptButton = $root.querySelector(cookieBannerAcceptSelector)
    const $rejectButton = $root.querySelector(cookieBannerRejectSelector)
    const $cookieMessage = $root.querySelector(cookieMessageSelector)

    const $cookieConfirmationAccept = $root.querySelector(
      cookieConfirmationAcceptSelector
    )
    const $cookieConfirmationReject = $root.querySelector(
      cookieConfirmationRejectSelector
    )
    const $cookieBannerHideButtons = $root.querySelectorAll(
      cookieBannerHideButtonSelector
    )

    console.log('HELLOOOOOOOOOO3')

    if (
      !($cookieBannerForm instanceof HTMLFormElement) ||
      !($acceptButton instanceof HTMLButtonElement) ||
      !($rejectButton instanceof HTMLButtonElement) ||
      !($cookieMessage instanceof HTMLElement) ||
      !($cookieConfirmationAccept instanceof HTMLElement) ||
      !($cookieConfirmationReject instanceof HTMLElement) ||
      !$cookieBannerHideButtons.length
    ) {
      return this
    }

    this.$cookieBannerForm = $cookieBannerForm
    this.$acceptButton = $acceptButton
    this.$rejectButton = $rejectButton
    this.$cookieMessage = $cookieMessage
    this.$cookieConfirmationAccept = $cookieConfirmationAccept
    this.$cookieConfirmationReject = $cookieConfirmationReject
    this.$rootHideButtons = $cookieBannerHideButtons

    console.log('HELLOOOOOOOOOO4')

    // // Show the cookie banner to users who have not consented or have an
    // // outdated consent cookie
    // const currentConsentCookie = CookieFunctions.getConsentCookie()

    // if (
    //   !currentConsentCookie ||
    //   !CookieFunctions.isValidConsentCookie(currentConsentCookie)
    // ) {
    //   // If the consent cookie version is not valid, we need to remove any cookies which have been
    //   // set previously
    //   CookieFunctions.resetCookies()

    //   this.$root.removeAttribute('hidden')
    // }

    this.$cookieBannerForm.onsubmit = (event) => {
      event.preventDefault()
      return false
    }

    this.$acceptButton.addEventListener(
      'click',
      () => {
        this.acceptCookies()
      },
      false
    )
    this.$rejectButton.addEventListener('click', () => {
      this.rejectCookies()
    })

    this.$rootHideButtons.forEach(($cookieBannerHideButton) => {
      $cookieBannerHideButton.addEventListener('click', () => this.hideBanner())
    })
  }

  /**
   * Hide banner
   */
  hideBanner() {
    this.$root.setAttribute('hidden', 'true')
  }

  getFormAttributes() {
    const form = this.$cookieBannerForm
    const acceptButton = this.$acceptButton
    const rejectButton = this.$rejectButton

    if (!form || !acceptButton || !rejectButton) {
      throw Error('Requirement is missings')
    }

    return { form, acceptButton, rejectButton }
  }

  /**
   * Accept cookies
   */
  async acceptCookies() {
    const { form, acceptButton } = this.getFormAttributes()

    // Do actual cookie consent bit
    const response = await fetch(form.action, {
      body: `${acceptButton.name}=${acceptButton.value}`,
      method: 'POST'
    })

    if (!response.ok) {
      throw Error('Failed to set cookie preferences')
    }

    // Hide banner and show confirmation message
    this.$cookieMessage?.setAttribute('hidden', 'true')
    this.revealConfirmationMessage(this.$cookieConfirmationAccept)
  }

  /**
   * Reject cookies
   */
  async rejectCookies() {
    const { form, rejectButton } = this.getFormAttributes()

    // Do actual cookie consent bit
    const response = await fetch(form.action, {
      body: `${rejectButton.name}=${rejectButton.value}`,
      method: 'POST'
    })

    if (!response.ok) {
      throw Error('Failed to set cookie preferences')
    }

    // Hide banner and show confirmation message
    this.$cookieMessage.setAttribute('hidden', 'true')
    this.revealConfirmationMessage(this.$cookieConfirmationReject)
  }

  /**
   * Reveal confirmation message
   * @param {HTMLElement} confirmationMessage - Confirmation message
   */
  revealConfirmationMessage(confirmationMessage) {
    confirmationMessage.removeAttribute('hidden')

    // Set tabindex to -1 to make the confirmation banner focusable with JavaScript
    if (!confirmationMessage.getAttribute('tabindex')) {
      confirmationMessage.setAttribute('tabindex', '-1')

      confirmationMessage.addEventListener('blur', () => {
        confirmationMessage.removeAttribute('tabindex')
      })
    }

    confirmationMessage.focus()
  }

  static defaults = {
    cookieCategory: 'analytics'
  }

  static schema = {
    properties: {
      cookieCategory: { type: 'string' }
    }
  }
}

/**
 * Cookie banner config
 * @typedef {object} CookieBannerConfig
 * @property {string} [cookieCategory] - category of cookie that the user is accepting/declining
 */

export default CookieBannerForm
