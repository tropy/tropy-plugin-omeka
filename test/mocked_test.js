'use strict'

const { expect } = require('chai')
const nock = require('nock')
const { OmekaApi } = require('../src/api')
const { URL } = require('../src/constants')
const { Plugin } = require('../src/plugin')
const fixtures = require('./fixtures')

const API_URL = 'http://mock.url/api'

function authQuery(params) {
  return Object.assign({
    key_identity: '<your_identity>',
    key_credential: '<your_credential>'
  }, params)
}

describe('Mocked requests', () => {
  beforeEach(() => {
    nock(API_URL)
      // list of vocabularies
      .get(URL.VOCABS)
      .query(true)
      .reply(200, fixtures.vocabularies)
      // properties from 1st vocabulary
      .get(URL.PROPS)
      .query(authQuery({ vocabulary_id: 1 }))
      .reply(200, fixtures.properties)
      // properties from 2nd vocabulary
      .get(URL.PROPS)
      .query(authQuery({ vocabulary_id: 2 }))
      .reply(200, fixtures.properties)

      // created item
      .post(URL.ITEMS).query(true).reply(200, { 'o:id': 1 })
      // first photo
      .post(URL.MEDIA).query(true).reply(200, { 'o:id': 2 })
      // second photo
      .post(URL.MEDIA).query(true).reply(200, { 'o:id': 3 })
       // selection
      .post(URL.MEDIA).query(true).reply(200, { 'o:id': 4 })
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
    const result = (await plugin.exec())[0]
    expect(result.item).to.eql(1)
    expect(result.medias).to.have.members([2, 3, 4])
  })

})
