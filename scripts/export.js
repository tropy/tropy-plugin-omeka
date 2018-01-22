#!/usr/bin/env node

'use strict'

const { app, BrowserWindow, ipcMain: ipc } = require('electron')
const url = require('url')
const path = require('path')

const argv = require('yargs').argv
const Promise = require('bluebird')
const readFileAsync = Promise.promisify(require('fs').readFile)
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

app.on('ready', async () => {
  var win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false
  })

  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  win.loadURL(url.format({
    pathname: path.join(__dirname, '../renderer/index.html'),
    protocol: 'file:',
    slashes: true
  }))

  win.on('closed', () => {
    win = null
  })

  logger.info('Reading config and data files...')

  const [config, data] = await Promise.all([
    readFile('config'),
    readFile('data')
  ])

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('plugin-start', config, data)
  })

  ipc.once('plugin-done', (event, count) => {
    win.webContents.once('destroyed', () => app.exit(count))
    win.close()
  })

  ipc.on('plugin-error', (_, error) => fail(error))
})

function fail(error) {
  logger.error(error.stack)
  app.exit(1)
}
