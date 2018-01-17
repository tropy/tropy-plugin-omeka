#!/usr/bin/env node

'use strict'

const argv = require('yargs').argv
const Promise = require('bluebird')
const readFileAsync = Promise.promisify(require('fs').readFile)
const { Plugin } = require('../src/plugin')
const logger = require('../src/logger')

async function readFile(key) {
  const fileName = argv[key]
  try {
    return JSON.parse(
      await readFileAsync(fileName, { encoding: 'utf8' }))
  } catch (error) {
    logger.error(`Argument --${key} should point to a valid json file`)
    process.exit()
  }
}

async function main() {
  logger.info('Reading items file...')

  const [config, data] = await Promise.all([
    readFile('config'),
    readFile('data')
  ])

  // similar object will be passed to the Plugin constructor
  // when called from Tropy
  const context = {
    fetch: require('node-fetch')
  }

  const plugin = new Plugin(config, context)
  plugin.exec(data)
}

main()
