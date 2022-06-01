'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const fetchMock = require('fetch-mock')
const { OmekaApi } = require('../src/api')
const { URL } = require('../src/constants')
const Plugin = require('..')
const fixtures = require('./fixtures')
const jsonld = require('jsonld')

const API_URL = 'http://mock.url/api'

const url = (route) => 'begin:' + API_URL + route // helper
var uploadCount = 2 // helper

fetchMock
  .get(url(URL.VOCABS), fixtures.vocabularies)
  .get(url(URL.PROPS), fixtures.properties)
  .post(url(URL.ITEMS), { 'o:id': 1 }) // item
  .post(url(URL.MEDIA), () => ({ // 2 photos and 1 selection
    'o:id': uploadCount++
  }))

describe('Mocked requests', () => {
  // in production, passed to Plugin from Tropy
  const context = {
    logger: {
      debug: sinon.spy(),
      error: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy()
    },
    json: {
      expand: jsonld.promises.expand
    }
  }

  it('getProperties', async () => {
    const api = new OmekaApi({ url: API_URL }, context)
    await api.getProperties()
    expect(api.properties).to.eql({
      ns1short1: 1,
      ns2short2: 2
    })

    expect(fetchMock.calls().length).to.eql(2)
    expect(fetchMock.calls(url(URL.VOCABS)).length).to.eql(1)
    expect(fetchMock.calls(url(URL.PROPS)).length).to.eql(1)
  })

  it('Plugin', async () => {
    fetchMock.reset()
    const plugin = new Plugin(
      { api: { url: API_URL } },
      context
    )
    let result = await plugin.export(fixtures.items)
    expect(result[0].item).to.eql(1)
    expect(result[0].medias).to.have.members([2, 3, 4])

    expect(fetchMock.calls(url(URL.VOCABS)).length).to.eql(1)
    expect(fetchMock.calls(url(URL.PROPS)).length).to.eql(1)
    expect(fetchMock.calls(url(URL.ITEMS)).length).to.eql(1)
    expect(fetchMock.calls(url(URL.MEDIA)).length).to.eql(3)
  })
})
