'use strict'

const { api: defaults } = require('../config.default')
const { name: product, version } = require('../package')
const { API, URL, TROPY, OMEKA } = require('./constants')
const { assign, entries } = Object
const request = require('./http')
const { nativeImage } = require('electron')
const { readFile } = require('fs').promises

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

const getList = (obj) => {
  const list = obj && obj.length && obj[0]['@list']
  return (list && list.length) ? list : []
}

class OmekaApi {
  constructor(config, context = {}) {
    this.config = assign({}, defaults, config)
    this.config.url = ensureUrl(this.config.url)
    this.missingProperties = []
    this.context = context
    this.logger = this.context.logger
  }

  request(url, params, qs = {}) {
    params.headers = params.headers || {}
    params.headers['User-Agent'] = `${product} ${version}`
    params.qs = params.qs || qs
    params.qs.key_identity = this.config.key_identity
    params.qs.key_credential = this.config.key_credential
    return request(this.config.url + url, params)
  }

  get(url, qs = {}) {
    return this.request(url, { method: 'GET' }, qs)
  }

  post(url, params) {
    return this.request(url, assign({ method: 'POST' }, params))
  }

  async getPropsList(pageNo = 1) {
    const results = await this.get(
      URL.PROPS, { per_page: API.PER_PAGE, page: pageNo }
    )
    if (results.length === API.PER_PAGE && pageNo < API.MAX_PAGES) {
      return results.concat(await this.getPropsList(pageNo + 1))
    } else {
      return results
    }
  }

  async getProperties() {
    const vocabs = await this.get(URL.VOCABS)
    const entireList = await this.getPropsList()
    this.properties = await parseProps(parseVocabs(vocabs), entireList)
    this.logger.info(
      `Omeka has ${this.properties.length} properties` +
      ` in ${vocabs.length} vocabularies`)
    this.logger.debug({ omekaProperties: this.properties })

  }

  async selectionImage(path, selection) {
    // create a buffer with the selection
    const get = name => selection[`${TROPY.NS}${name}`][0]['@value']
    const coords = {
      x: get('x'),
      y: get('y'),
      width: get('width'),
      height: get('height')
    }

    return nativeImage
      .createFromPath(path)
      .crop(coords)
      .toJPEG(100)
  }

  async mediaForm(itemId, path, metadata, selection) {
    const data = assign({
      'o:ingester': 'upload',
      'file_index': 0,
      'o:item': {
        'o:id': itemId
      }
    }, metadata)

    const buffer = selection ?
      this.selectionImage(path, selection) :
      readFile(path)

    const form = new FormData()
    form.append('data', JSON.stringify(data))
    form.append('file[]', new File([await buffer],
                                   selection ? 'Selection' : path))

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
    if (this.config.resource_template) {
      result['o:resource_template'] = {
        'o:id': this.config.resource_template
      }
    }
    return result
  }

  getNotes(item) {
    var notes = []
    item[TROPY.PHOTO][0]['@list'].map(photo => {
      //photos notes
      if (photo[TROPY.NOTE]) {
        photo[TROPY.NOTE][0]['@list'].map(note => {
          notes.push({ html: note[TROPY.HTML][0]['@value'] })
        })
      }

      //selections notes
      if (photo[TROPY.SELECTION]) {
        photo[TROPY.SELECTION][0]['@list'].map(selection => {
          if (selection[TROPY.NOTE]) {
            selection[TROPY.NOTE][0]['@list'].map(note => {
              notes.push({ html: note[TROPY.HTML][0]['@value'] })
            })
          }
        })
      }
    })

    return notes
  }

  // picture could be a photo or a selection
  uploadPicture(picture, itemId, path, selection) {
    const metadata = this.buildMetadata(picture, this.properties)
    this.logger.debug({ photoMetadata: metadata[OMEKA.WHATEVER] })
    return this.mediaForm(itemId, path, metadata, selection)
      .then(params => this.post(URL.MEDIA, params))
  }

  async uploadNotes(itemId, notes) {
    if (notes.length > 0) {
      var html = notes.map(e => e.html).join('<hr/>')

      const form = {
        'o:renderer': 'html',
        'o:is_public': true,
        '@type': 'cnt:ContentAsText',
        'cnt:characterEncoding': 'UTF-8',
        'o:ingester': 'html',
        'o:item': { 'o:id': itemId },
        'data': { html: html },
        'dcterms:title': [
          {
            'property_id': 1,
            '@value': 'Notes',
            'type': 'literal',
            'property_label': 'Title'
          }
        ]
      }

      const params = {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      }
      return this.post(URL.MEDIA, params)
    }
  }

  async uploadMedia(itemId, photos) {
    let result = []

    for (const photo of photos) {
      const path = photo[TROPY.PATH][0]['@value']

      // upload the photo itself, wait till it uploads
      result.push(await this.uploadPicture(photo, itemId, path))

      // upload selections as separate photos
      const selections = getList(photo[TROPY.SELECTION])
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
          this.logger.error({ stack: e.stack }, 'Could not upload selection')
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

    await this.uploadNotes(itemId, this.getNotes(item))

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
