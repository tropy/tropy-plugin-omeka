'use strict'

module.exports = {
  URL: {
    ITEMS: '/items',
    VOCABS: '/vocabularies',
    PROPS: '/properties',
    MEDIA: '/media'
  },
  TROPY: {
    NS: 'https://tropy.org/v1/tropy#',
    PHOTO: 'https://tropy.org/v1/tropy#photo',
    ITEM: 'https://tropy.org/v1/tropy#Item',
    PATH: 'https://tropy.org/v1/tropy#path',
    SELECTION: 'https://tropy.org/v1/tropy#selection',
  },
  DC: {
    TITLE: 'http://purl.org/dc/terms/title'
  },
  OMEKA: {
    // Can be removed if
    // https://github.com/omeka/omeka-s/issues/1171 gets resolved
    WHATEVER: 'hello-from-tropy'
  }
}
