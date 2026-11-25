// Transport supplied by the host, never a global bus.
var createDispatcher, createEventClient;

createEventClient = function(request) {
  return {
    readText: function(path) {
      return request('files::event:readText', {path});
    },
    writeText: function(path, text) {
      return request('files::event:writeText', {path, text});
    },
    list: function(path) {
      return request('files::event:list', {path});
    },
    mkdir: function(path, recursive = false) {
      return request('files::event:mkdir', {path, recursive});
    }
  };
};

createDispatcher = function(context) {
  return async function(event, payload = {}) {
    var ref, ref1;
    if (event !== 'files::event:readText' && event !== 'files::event:writeText' && event !== 'files::event:list' && event !== 'files::event:mkdir') {
      throw new Error(`Unsupported I/O event: ${event}`);
    }
    if (typeof payload.path !== 'string') {
      throw new TypeError('path must be a string');
    }
    switch (event) {
      case 'files::event:readText':
        return (await context.files.readFile(payload.path, 'utf8'));
      case 'files::event:writeText':
        if (typeof payload.text !== 'string') {
          throw new TypeError('text must be a string');
        }
        await context.files.writeFile(payload.path, payload.text, 'utf8');
        return null;
      case 'files::event:list':
        return (await context.files.readdir(payload.path));
      case 'files::event:mkdir':
        if (typeof ((ref = payload.recursive) != null ? ref : false) !== 'boolean') {
          throw new TypeError('recursive must be boolean');
        }
        await context.files.mkdir(payload.path, {
          recursive: (ref1 = payload.recursive) != null ? ref1 : false
        });
        return null;
    }
  };
};

module.exports = {createEventClient, createDispatcher};
