'use strict'

require('./console')
const { ipcRenderer: ipc, nativeImage } = require('electron')
const Plugin = require('..')
const logger = require('../src/logger')
const { promises: jsonld } = require('jsonld')

ipc.on('plugin-start', async (event, config, data) => {
  try {
    // Similar object will be passed to the Plugin constructor
    // when called from Tropy
    const context = {
      logger,
      jsonld,
      nativeImage
    }

    const plugin = new Plugin(config, context)
    await plugin.export(data)
    ipc.send('plugin-done')
  } catch ({ message, stack }) {
    ipc.send('plugin-error', { message, stack })
  }
})
