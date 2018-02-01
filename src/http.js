'use strict'

const querystring = require('querystring')
const { keys } = Object

function addQueryString(url, qs = {}) {
  if (keys(qs)) {
    url += '?' + querystring.stringify(qs)
  }
  return url
}

module.exports = async function (url, params) {
  url = addQueryString(url, params.qs)
  delete params.qs

  const res = await fetch(url, params)
  return await res.json()
}
