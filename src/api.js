'use strict'

const { api: defaults } = require('../config.default')
const request = require('request-promise')
const { name: product, version } = require('../package')
const { URL, TROPY } = require('./constants')
const { entries } = Object
const { createReadStream } = require('fs')

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

function prepareItem(item, props) {
  const result = {}
  result[TROPY.ITEM] = []

  for (let [propertyUri, values] of entries(item)) {
    const propertyOmekaId = props[propertyUri]
    if (propertyOmekaId) {
      for (let value of values) {
        result[TROPY.ITEM].push({
          'type': 'literal',
          'property_id': propertyOmekaId,
          '@value': value['@value']
        })
      }
    }
  }
  return result
}

class OmekaApi {
  constructor(config) {
    this.config = { ...defaults, ...config }
    this.config.url = ensureUrl(this.config.url)
  }

  req(url, params) {
    return request({
      uri: this.config.url + url,
      qs: {
        key_identity: this.config.key_identity,
        key_credential: this.config.key_credential
      },
      headers: {
        'User-Agent': `${product} ${version}`,
      },
      json: true,
      ...params
    })
  }

  get(url) {
    return this.req(url, { method: 'GET' })
  }

  post(url, params) {
    return this.req(url, { method: 'POST', ...params })
  }

  async getProperties() {
    const [vocabs, props] = await Promise.all([
      this.get(URL.VOCABS),
      this.get(URL.PROPS)
    ])
    this.properties = await parseProps(parseVocabs(vocabs), props)
  }

  addMedia(id, path) {
    const body = {
      'o:ingester': 'upload',
      'file_index': 0,
      'o:item': {
        'o:id': id
      }
    }
    return this.post(URL.MEDIA, {
      formData: {
        'data': JSON.stringify(body),
        'file[]': [
          createReadStream(path)
        ]
      }
    })
  }

  async export(item) {
    // create Item
    var itemId
    const body = prepareItem(item, this.properties)
    const createRequest = this.post(URL.ITEMS, { body })
    try {
      itemId = (await createRequest)['o:id']
    } catch (e) {
      console.log('Could not create item', e)
      return false
    }
    console.log(`Item ${itemId} created`)

    // create item's Photos
    const photos = item[TROPY.PHOTO][0]['@list']
    for (let photo of photos) {
      const path = photo[TROPY.PATH][0]['@value']
      try {
        this.addMedia(itemId, path)
      } catch (e) {
        console.warn('Could not create photo', e)
      }
    }

    return createRequest
  }
}

module.exports = {
  OmekaApi,
  ensureUrl,
  parseVocabs,
  parseProps,
  prepareItem
}
