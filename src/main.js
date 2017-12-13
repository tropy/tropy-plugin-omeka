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
  console.log('Reading items file...')

  const config = await readFile('config')
  const data = await readFile('data')

  const expanded = await jsonld.expand(data)

  console.log('Connecting to API...')

  const api = new OmekaApi(config.api)
  if (!api.getProperties()) {
    return
  }

  console.log('Exporting...')

  for (let grouped of expanded) {
    const { '@graph': graph } = grouped
    for (let item of graph) {
      try {
        // await api.export(item)
      } catch (err) {
        console.error(`Failed to export item ${item}`)
        if (!config.ignoreErrors) {
          break
        }
      }
    }
  }


}

main()
