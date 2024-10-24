import { URL } from 'node:url'
/**
 * Enforces use of relative URL's, prevents someone maliciously causing a user to be directed to a phishing
 * site.
 */
export class RelativeUrl {
  static VISIT_IDENTIFIER_PARAMETER = 'visit'
  url: URL
  originalUrlString: string

  constructor(urlString: string) {
    this.url = new URL(urlString, 'http://www.example.com')
    this.originalUrlString = urlString

    if (this.url.hostname !== 'www.example.com') {
      throw Error('Only relative URLs are allowed')
    }
  }

  setParam(name: string, value?: string) {
    this.url.searchParams.set(name, value ?? '')
    return this
  }

  getParam(name: string) {
    return this.url.searchParams.get(name)
  }

  toString() {
    let url = this.url.pathname + this.url.search
    if (url.startsWith('/') && !this.originalUrlString.startsWith('/')) {
      url = url.slice(1)
    }
    return url
  }
}
