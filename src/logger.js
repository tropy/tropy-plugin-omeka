'use strict'

const bunyan = require('bunyan')
module.exports = bunyan.createLogger({
  name: 'tropy-omeka',
  streams: [
    {
      level: 'info',
      stream: process.stdout
    },
    {
      level: 'debug',
      path: './debug.log'
    }
  ]
})
