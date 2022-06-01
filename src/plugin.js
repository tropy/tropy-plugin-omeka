'use strict'

const { OmekaApi } = require('./api')
const { TITLES } = require('./constants')

const configDefaults = {
  ignoreErrors: true
}

class Plugin {
  constructor(config, context) {
    this.config = Object.assign({}, configDefaults, config)
    this.context = context || {}
    this.logger = this.context.logger
  }

  itemTitle(item) {
    for (let [key, value] of Object.entries(item)) {
      if (TITLES.includes(key)) {
        return value[0]['@value']
      }
    }
    return '[Untitled]'
  }

  async export(data) {
    const expanded = await this.context.json.expand(data)

    this.logger.info('Connecting to API...')

    const api = new OmekaApi(this.config.api, this.context)
    try {
      await api.getProperties()
    } catch (e) {
      this.logger.error({
        stack: e.stack
      }, `Could not connect to API: ${api.config.url}`)
      return
    }

    this.logger.info('Exporting...')

    const results = []
    for (let grouped of expanded) {
      const { '@graph': graph } = grouped
      for (let item of graph) {
        const title = this.itemTitle(item)
        this.logger.info(`Item "${title}"...`)

        try {
          const result = await api.export(item)
          this.logger.info(
            `Item #${result.item} with Photos [${result.medias}] created`)
          results.push(result)
        } catch (e) {
          this.logger.error({
            stack: e.stack
          }, `Failed to export item "${title}"`)
          if (!this.config.ignoreErrors) {
            break
          }
        }
      }
    }

    api.warnMissingProperties()

    return results
  }
}

module.exports = Plugin
