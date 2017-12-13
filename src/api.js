'use strict'

const { api: defaults } = require('../config.default')
const request = require('request-promise')
const { name: product, version } = require('../package')

// url should end in "/api"
function ensureUrl(url) {
  // remove trailing slash
  url = url.replace(/\/$/, '')

  // if using an instance url, append 'api' to path
  if (!url.endsWith('api')) url += '/api'

  return url
}

function parseVocabs(vocabs = []) {
  return vocabs.reduce((result, vocab) => {
    const key = vocab['o:prefix']
    result[key] = vocab['o:namespace_uri']
    return result
  }, {})
}

function parseProps(vocabs, props = []) {
  return props.reduce((result, prop) => {
    const term = prop['o:term']
    const [prefix, rest] = term.split(':')
    const ns = vocabs[prefix]
    if (!ns) return result
    const full = ns + rest
    result[full] = prop['o:id']
    return result
  }, {})
}

class OmekaApi {
  constructor(config) {
    this.config = { ...defaults, ...config }
    this.config.url = ensureUrl(this.config.url)
  }

  req(url, method) {
    return request({
      uri: this.config.url + url,
      method,
      qs: {
        key_identity: this.config.key_identity,
        key_credential: this.config.key_credential
      },
      headers: {
        'User-Agent': `${product} ${version}`
      },
      json: true
    })
  }

  get(url) {
    return this.req(url, 'GET')
  }

  // post(url) {
  //   return this.req(url, 'POST')
  // }

  async getProperties() {
    try {
      this.vocabularies = parseVocabs(await this.get('/vocabularies'))
      this.properties = parseProps(
        this.vocabularies, await this.get('/properties'))
    } catch (error) {
      console.error(`Could not connect to API: ${this.config.url}`)
      return false
    }
    return true
  }

  // async export(item) {
  //   console.log(item)
  // }
}

module.exports = {
  OmekaApi,
  ensureUrl,
  parseVocabs,
  parseProps
}
