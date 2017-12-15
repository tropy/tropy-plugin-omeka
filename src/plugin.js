'use strict'

const { promises: jsonld } = require('jsonld')
const { OmekaApi } = require('./api')

class Plugin {
  constructor(config, data) {
    this.data = data
    this.config = config
  }

  async exec() {
    const expanded = await jsonld.expand(this.data)
    console.info('Connecting to API...')

    const api = new OmekaApi(this.config.api)
    try {
      await api.getProperties()
    } catch (error) {
      console.error(
        `Could not connect to API: ${api.config.url}`, error.message)
      return
    }

    console.info('Exporting...')

    const results = []
    for (let grouped of expanded) {
      const { '@graph': graph } = grouped
      for (let item of graph) {
        try {
          const result = await api.export(item)
          console.log(
            `Item #${result.item} with Photos [${result.medias}] created`)
          results.push(result)
        } catch (err) {
          console.error(`Failed to export item ${item}`, err.message)
          if (!this.config.ignoreErrors) {
            break
          }
        }
      }
    }
    return results
  }
}

module.exports = {
  Plugin
}
