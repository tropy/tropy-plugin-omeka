#!/usr/bin/env node

'use strict'

const argv = require('yargs').argv
const Promise = require('bluebird')
const path = require('path')
const readFileAsync = Promise.promisify(require('fs').readFile)
const { Plugin } = require('../src/plugin')


async function readFile(key) {
  const fileName = argv[key]
  try {
    return JSON.parse(
      await readFileAsync(fileName, { encoding: 'utf8' }))
  } catch (error) {
    console.error(`Argument --${key} should point to a valid json file`)
    process.exit()
  }
}

async function main() {
  console.info('Reading items file...')

  const [config, data] = await Promise.all([
    readFile('config'),
    readFile('data')
  ])

  const plugin = new Plugin(config, data)
  plugin.exec()
}

main()
