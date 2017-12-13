'use strict'

const fs = require('fs')
const argv = require('yargs').argv
const { promisify } = require('util')
const readFileAsync = promisify(fs.readFile)
const { promises: jsonld } = require('jsonld')
const { OmekaApi } = require('./api')

async function readFile(key) {
  try {
    return JSON.parse(
      await readFileAsync(
        argv[key],
        { encoding: 'utf8' }))
  } catch (error) {
    console.error(`Argument --${key} should point to a valid json file`)
    process.exit()
  }
}


async function main() {
  console.info('Reading items file...')

  const config = await readFile('config')
  const data = await readFile('data')

  const expanded = await jsonld.expand(data)

  console.info('Connecting to API...')

  const api = new OmekaApi(config.api)
  try {
    await api.getProperties()
  } catch (error) {
    console.error(`Could not connect to API: ${api.config.url}`, error)
    return
  }

  console.info('Exporting...')

  for (let grouped of expanded) {
    const { '@graph': graph } = grouped
    for (let item of graph) {
      try {
        const response = await api.export(item)
        console.log(response)
      } catch (err) {
        console.error(`Failed to export item ${item}`, err)
        if (!config.ignoreErrors) {
          break
        }
      }
    }
  }


}

main()
