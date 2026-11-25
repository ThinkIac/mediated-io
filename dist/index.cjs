// Optional Node adapter; core.cjs does not load these native APIs.
var createDispatcher, createEventClient, createMediatedIO;

({createMediatedIO, createEventClient, createDispatcher} = require('./core.cjs'));

module.exports = {...createMediatedIO({
    fs: require('node:fs'),
    path: require('node:path'),
    spawn: require('node:child_process').spawn,
    URL: globalThis.URL,
    fetch: function(...args) {
      return globalThis.fetch(...args);
    }
  }), createEventClient, createDispatcher};
