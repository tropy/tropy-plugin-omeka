'use strict'

const fs = require('fs')
const argv = require('yargs').argv
const { promisify } = require('util')
const readFileAsync = promisify(fs.readFile)

async function readFile(key) {
  try {
    return JSON.parse(
      await readFileAsync(
        argv[key],
        { encoding: 'utf8' }))
  } catch (error) {
    console.error(`Argument --${key} should point to a valid json file`, error)
    process.exit()
  }
}

async function main() {
  console.log('Reading arguments parameters...')

  const config = await readFile('config')
  const data = await readFile('data')

  console.log('Connecting to API...')

  console.log('Reading file...')

  console.log('Exporting...')
}

main()
