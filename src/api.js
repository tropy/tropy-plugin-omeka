'use strict'

const { api: defaults } = require('../config.default')
const request = require('request-promise')
const { name: product, version } = require('../package')
const { URL, TROPY } = require('./constants')
const { entries } = Object
const { createReadStream } = require('fs')
const sharp = require('sharp')
const tmp = require('tmp')
tmp.setGracefulCleanup()



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

function buildMetadata(item, props) {
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

  async mediaStream(path, selection) {
    // create a stream that is attached to the upload form
    // (optionally cropped if given a selection)
    const get = name => selection[`${TROPY.NS}${name}`][0]['@value']

    const coords = {}
    try {
      coords.left = get('x')
      coords.top = get('y')
      coords.width = get('width')
      coords.height = get('height')
    } catch (e) {
      console.error('Selection missing essential property')
      return
    }

    // save the cropped selection to a tmp file
    const postfix = path.match(/\..[^.]*$/)[0]
    const tmpFile = tmp.fileSync({ postfix })
    await sharp(path)
      .extract(coords)
      .toFile(tmpFile.name)
    return createReadStream(tmpFile.name)
  }

  async mediaForm(itemId, path, metadata, selection) {
    const data = {
      'o:ingester': 'upload',
      'file_index': 0,
      'o:item': {
        'o:id': itemId
      },
      ...metadata
    }

    const file =
      selection ?
      await this.mediaStream(path, selection) :
      createReadStream(path)
    if (!file) return

    return {
      formData: {
        'data': JSON.stringify(data),
        'file[]': [file]
      }
    }
  }

  // picture could be a photo or a selection
  uploadPicture(picture, itemId, path, selection) {
    const metadata = buildMetadata(picture, this.properties)
    return this.mediaForm(itemId, path, metadata, selection)
      .then(params => this.post(URL.MEDIA, params))
  }

  *uploadMedia(itemId, photos) {
    for (const photo of photos) {
      const path = photo[TROPY.PATH][0]['@value']
      // upload the photo itself
      yield this.uploadPicture(photo, itemId, path)

      // upload selections as separate photos
      for (const selection of photo[TROPY.SELECTION] || []) {
        yield this.uploadPicture(selection, itemId, path, selection)
      }
    }
  }

  createItem(item) {
    const body = buildMetadata(item, this.properties)
    return this.post(URL.ITEMS, { body })
  }

  async export(item) {
    // create Item
    const itemId = (await this.createItem(item))['o:id']
    if (!itemId) return

    // create item's Photos and Selections
    const photos = item[TROPY.PHOTO][0]['@list']
    const medias = await Promise.all(
      this.uploadMedia(itemId, photos))

    return {
      item: itemId,
      medias: medias.map(m => m['o:id'])
    }
  }
}

module.exports = {
  OmekaApi,
  ensureUrl,
  parseVocabs,
  parseProps,
  buildMetadata
}
