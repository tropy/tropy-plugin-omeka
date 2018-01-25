'use strict'

const { promises: jsonld } = require('jsonld')
const { OmekaApi } = require('./api')
const { TITLES } = require('./constants')
const logger = require('./logger')


class Plugin {
  constructor(config, context) {
    this.config = config
    this.context = context
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
    const expanded = await jsonld.expand(data)
    logger.info('Connecting to API...')

    const api = new OmekaApi(this.config.api, this.context)
    try {
      await api.getProperties()
    } catch (error) {
      logger.error(
        `Could not connect to API: ${api.config.url}`, error.message)
      return
    }

    logger.info('Exporting...')

    const results = []
    for (let grouped of expanded) {
      const { '@graph': graph } = grouped
      for (let item of graph) {
        const title = this.itemTitle(item)
        logger.info(`Item "${title}"...`)

        try {
          const result = await api.export(item)
          logger.info(
            `Item #${result.item} with Photos [${result.medias}] created`)
          results.push(result)
        } catch (err) {
          logger.error(`Failed to export item "${title}"`,
                        err.message, err.stack)
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
