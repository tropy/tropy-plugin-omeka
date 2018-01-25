'use strict'

const { api: defaults } = require('../config.default')
const { name: product, version } = require('../package')
const { URL, TROPY, OMEKA } = require('./constants')
const { assign, entries } = Object
const Promise = require('bluebird')
const readFileAsync = Promise.promisify(require('fs').readFile)
const Jimp = require('jimp')
Jimp.prototype.writeAsync = Promise.promisify(Jimp.prototype.write)
const tmp = require('tmp')
tmp.setGracefulCleanup()
const { flatten } = require('./utils')
const request = require('./http')


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
  constructor(config, context = {}) {
    this.config = assign({}, defaults, config)
    this.config.url = ensureUrl(this.config.url)
    this.missingProperties = []
    this.context = context
    this.logger = this.context.logger || require('./logger')
  }

  request(url, params, qs = {}) {
    params.headers = params.headers || {}
    params.headers['User-Agent'] = `${product} ${version}`
    params.qs = params.qs || qs
    params.qs.key_identity = this.config.key_identity
    params.qs.key_credential = this.config.key_credential
    return request(this.config.url + url, params, this.context.fetch)
  }

  get(url, qs = {}) {
    return this.request(url, { method: 'GET' }, qs)
  }

  post(url, params) {
    return this.request(url, assign({ method: 'POST' }, params))
  }

  async getProperties() {
    const vocabs = await this.get(URL.VOCABS)
    const vocabsIDs = vocabs.map(v => v['o:id'])
    const props = await Promise.all(
      vocabsIDs.map(v => this.get(URL.PROPS, { vocabulary_id: v }), this)
    )
    const allProps = flatten(props)
    this.logger.info(
      `Omeka has ${allProps.length} properties` +
      ` in ${vocabs.length} vocabularies`)

    this.properties = await parseProps(parseVocabs(vocabs), allProps)
    this.logger.debug({ omekaProperties: this.properties })
  }

  async selectionPath(path, selection) {
    // create a tmp file with the selection
    const get = name => selection[`${TROPY.NS}${name}`][0]['@value']
    const coords = [get('x'), get('y'), get('width'), get('height')]

    // save the cropped selection to a tmp file
    const postfix = path.match(/\..[^.]*$/)[0]
    const tmpFile = tmp.fileSync({ postfix })

    const image = await Jimp.read(path)
    image.crop.apply(image, coords)
    await image.writeAsync(tmpFile.name)
    return tmpFile.name
  }

  async mediaForm(itemId, path, metadata, selection) {
    const data = assign({
      'o:ingester': 'upload',
      'file_index': 0,
      'o:item': {
        'o:id': itemId
      }
    }, metadata)

    if (selection) {
      path = await this.selectionPath(path, selection)
    }
    if (!path) return

    const buffer = await readFileAsync(path)

    const form = new this.context.FormData()
    form.append('data', JSON.stringify(data))
    form.append('file[]', new File([buffer], selection ? 'Selection' : path))

    return {
      body: form
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
      this.logger.warn('Following properties don\'t exist in Omeka' +
                  ' and have not been exported:')
      this.logger.warn(this.missingProperties)
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
    this.logger.debug({ photoMetadata: metadata[OMEKA.WHATEVER] })
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
          this.logger.warn('Skipping Selection: missing dimension property')
          continue
        }
        var upload
        try {
          upload = this.uploadPicture(selection, itemId, path, selection)
          upload && result.push(upload)
        } catch (e) {
          this.logger.error('Could not upload selection', e)
        }
      }
    }

    return result
   }

  createItem(item) {
    const body = this.buildMetadata(item, this.properties)
    this.logger.debug({ itemMetadata: body[OMEKA.WHATEVER] })
    return this.post(URL.ITEMS, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async export(item) {
    // upload Item
    const itemResponse = await this.createItem(item)
    this.logger.debug({ itemResponse })
    const itemId = itemResponse['o:id']
    if (!itemId) return

    // upload Item's Photos and Selections
    const photos = item[TROPY.PHOTO][0]['@list']
    const medias = await Promise.all(
      await this.uploadMedia(itemId, photos))
    medias.map(photoResponse => {
      this.logger.debug({ photoResponse })
      if (photoResponse.errors) {
        this.logger.error(photoResponse.errors)
      }
    })

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
