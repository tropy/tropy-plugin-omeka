'use strict'

const { ipcRenderer: ipc } = require('electron')
const { Plugin } = require('./src/plugin')

ipc.on('plugin-start', async (event, config, data) => {
  // Similar object will be passed to the Plugin constructor
  // when called from Tropy
  const context = {
    fetch,
    FormData
  }

  try {
    const plugin = new Plugin(config, context)
    await plugin.exec(data)
    ipc.send('plugin-done')
  } catch ({ message, stack }) {
    ipc.send('plugin-error', { message, stack })
  }
})
