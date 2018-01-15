'use strict'

const { api: defaults } = require('../config.default')
const rp = require('request-promise')
const { name: product, version } = require('../package')
const { URL, TROPY, OMEKA } = require('./constants')
const { entries } = Object
const { createReadStream } = require('fs')
const sharp = require('sharp')
const tmp = require('tmp')
tmp.setGracefulCleanup()
const logger = require('./logger')
const { flatten } = require('./utils')

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

function convert(property, conversionRules = {}) {
  for (let [key, value] of entries(conversionRules)) {
    if (property.startsWith(key)) {
      return property.replace(key, value)
    }
  }
  return property
}

class OmekaApi {
  constructor(config) {
    this.config = { ...defaults, ...config }
    this.config.url = ensureUrl(this.config.url)
    this.missingProperties = []
  }

  request(url, params, qs = {}) {
    return rp({
      uri: this.config.url + url,
      qs: {
        key_identity: this.config.key_identity,
        key_credential: this.config.key_credential,
        ...qs
      },
      headers: {
        'User-Agent': `${product} ${version}`,
      },
      json: true,
      ...params
    })
  }

  get(url, qs = {}) {
    return this.request(url, { method: 'GET' }, qs)
  }

  post(url, params) {
    return this.request(url, { method: 'POST', ...params })
  }

  async getProperties() {
    const vocabs = await this.get(URL.VOCABS)
    const vocabsIDs = vocabs.map(v => v['o:id'])
    const props = await Promise.all(
      vocabsIDs.map(v => this.get(URL.PROPS, { vocabulary_id: v }), this)
    )
    const allProps = flatten(props)
    logger.info(
      `Omeka has ${allProps.length} properties` +
      ` in ${vocabs.length} vocabularies`)

    this.properties = await parseProps(parseVocabs(vocabs), allProps)
    logger.debug({ omekaProperties: this.properties })
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
      logger.warn('Selection missing essential property', e)
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

  // keep a list of missing properties, warn the user after export.
  addMissingProperty(property) {
    if (property !== '@type' && !property.startsWith(TROPY.NS)) {
      if (!this.missingProperties.includes(property)) {
        this.missingProperties.push(property)
      }
    }
  }

  warnMissingProperties() {
    if (this.missingProperties.length) {
      logger.warn('Following properties don\'t exist in Omeka' +
                  ' and have not been exported:')
      logger.warn(this.missingProperties)
    }
  }

  buildMetadata(thing, props) {
    const result = {}
    result[OMEKA.WHATEVER] = []

    for (let [propertyUri, values] of entries(thing)) {
      propertyUri = convert(propertyUri, this.config.convert)
      const propertyOmekaId = props[propertyUri]
      if (propertyOmekaId) {
        for (let value of values) {
          result[OMEKA.WHATEVER].push({
            'type': 'literal',
            'property_id': propertyOmekaId,
            '@value': value['@value']
          })
        }
      } else {
        this.addMissingProperty(propertyUri)
      }
    }
    return result
  }

  // picture could be a photo or a selection
  uploadPicture(picture, itemId, path, selection) {
    const metadata = this.buildMetadata(picture, this.properties)
    logger.debug({ photoMetadata: metadata[OMEKA.WHATEVER] })
    return this.mediaForm(itemId, path, metadata, selection)
      .then(params => this.post(URL.MEDIA, params))
  }

  async uploadMedia(itemId, photos) {
    let result = []

    for (const photo of photos) {
      const path = photo[TROPY.PATH][0]['@value']

      // upload the photo itself, wait till it uploads
      result.push(await this.uploadPicture(photo, itemId, path))

      // upload selections as separate photos
      const selections = photo[TROPY.SELECTION] || []
      for (const selection of selections) {
        // skip selections without proper dimensions
        if (!['x', 'y', 'width', 'height']
            .every(p => selection[`${TROPY.NS}${p}`])) {
          logger.warn('Skipping Selection: missing dimension property')
          continue
        }
        var upload
        try {
          upload = this.uploadPicture(selection, itemId, path, selection)
          upload && result.push(upload)
        } catch (e) {
          logger.error('Could not upload selection', e)
        }
      }
    }

    return result
   }

  createItem(item) {
    const body = this.buildMetadata(item, this.properties)
    logger.debug({ itemMetadata: body[OMEKA.WHATEVER] })
    return this.post(URL.ITEMS, { body })
  }

  async export(item) {
    // upload Item
    const itemResponse = await this.createItem(item)
    logger.debug({ itemResponse })
    const itemId = itemResponse['o:id']
    if (!itemId) return

    // upload Item's Photos and Selections
    const photos = item[TROPY.PHOTO][0]['@list']
    const medias = await Promise.all(
      await this.uploadMedia(itemId, photos))
    medias.map(photoResponse => logger.debug({ photoResponse }))

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
  convert
}
