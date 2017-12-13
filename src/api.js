'use strict'

const { api: defaults } = require('../config.default')

// url should end in "/api"
function ensureUrl(url) {
  // remove trailing slash
  url = url.replace(/\/$/, '')

  // if using an instance url, append 'api' to path
  if (!url.endsWith('api')) url += '/api'

  return url
}

class OmekaApi {
  constructor (config) {
    this.config = {
      ...defaults,
      ...config,
    }
    this.config.url = ensureUrl(this.config.url)
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
  OmekaApi,
  ensureUrl
}
