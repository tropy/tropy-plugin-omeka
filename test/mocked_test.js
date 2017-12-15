'use strict'

const { expect } = require('chai')
const nock = require('nock')
const { OmekaApi } = require('../src/api')
const { URL } = require('../src/constants')
const { Plugin } = require('../src/plugin')
const fixtures = require('./fixtures')

const API_URL = 'http://mock.url/api'

describe('Mocked requests', () => {
  beforeEach(() => {
    nock(API_URL)
      .get(URL.PROPS)
      .query(true)
      .reply(200, fixtures.properties)
      .get(URL.VOCABS)
      .query(true)
      .reply(200, fixtures.vocabularies)

      .post(URL.ITEMS)
      .query(true)
      // created item
      .reply(200, { 'o:id': 1 })
      .post(URL.MEDIA)
      .query(true)
      // first photo
      .reply(200, { 'o:id': 2 })
      .post(URL.MEDIA)
      .query(true)
      // second photo
      .reply(200, { 'o:id': 3 })
  })

  it('getProperties', async () => {
    const api = new OmekaApi({ url: API_URL })
    await api.getProperties()
    expect(api.properties).to.eql({
      ns1short1: 1,
      ns2short2: 2
    })
  })

  it('Plugin', async () => {
    const plugin = new Plugin(
      { api: { url: API_URL } },
      fixtures.items
    )
    expect(await plugin.exec()).to.eql([{
      item: 1,
      medias: [2, 3]
    }])
  })

})
