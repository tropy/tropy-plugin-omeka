'use strict'


class OmekaApi {
  constructor (config) {
    this.url = this.ensureUrl(config.url)
    this.key_identity = config.key_identity
    this.key_credentials = config.key_credentials
  }

  // this.url should end in "/api"
  ensureUrl(url) {
    // remove trailing slash
    url = url.replace(/\/$/, '')
    // if using an instance url, append 'api' to path
    if (!url.endsWith('api')) url += '/api'
    return url
  }

  get connectionOk() {
    // TODO: test connection
    // store parameters, e.g. what properties Omeka has
    return true
  }

  async export(item) {
    // TODO: test connection
  }
}

module.exports = {
  OmekaApi
}
