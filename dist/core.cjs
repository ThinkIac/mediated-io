  // Platform capabilities are injected; importing the core performs no native I/O.
var ProcessBoundaryError, ResourceBoundaryError, SecretHandle, createMediatedIO,
  indexOf = [].indexOf;

ResourceBoundaryError = class ResourceBoundaryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ResourceBoundaryError';
    this.code = 'RESOURCE_BOUNDARY_DENIED';
  }

};

ProcessBoundaryError = class ProcessBoundaryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProcessBoundaryError';
    this.code = 'PROCESS_BOUNDARY_DENIED';
  }

};

SecretHandle = class SecretHandle {
  constructor(name1, resolve) {
    this.name = name1;
    Object.defineProperty(this, 'withValue', {
      value: async function(consumer) {
        if (typeof consumer !== 'function') {
          throw new TypeError('Secret consumer must be a function');
        }
        return consumer((await resolve()));
      }
    });
    Object.freeze(this);
  }

  toString() {
    return '[REDACTED]';
  }

  toJSON() {
    return '[REDACTED]';
  }

};

createMediatedIO = function({
    fs,
    path,
    spawn,
    URL: URLClass,
    fetch: defaultFetch
  }) {
  var PackageFiles, PackageNetwork, PackageProcess, PackageSecrets, inside, nearestExisting, relativeResource;
  relativeResource = function(input) {
    var clean, normalized;
    if (!(typeof input === 'string' && input && !path.isAbsolute(input) && !input.includes('\0'))) {
      throw new ResourceBoundaryError('Path must be a non-empty package-relative path');
    }
    normalized = input.replace(/\\/g, '/');
    if (indexOf.call(normalized.split('/'), '..') >= 0) {
      throw new ResourceBoundaryError('Path traversal is not allowed');
    }
    clean = path.posix.normalize(normalized).replace(/^\.\//, '');
    if (!clean || clean.startsWith('../')) {
      throw new ResourceBoundaryError('Path escapes the package');
    }
    return clean;
  };
  inside = function(root, candidate) {
    var relative;
    relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  };
  nearestExisting = function(input) {
    var current, parent;
    current = input;
    while (!fs.existsSync(current)) {
      parent = path.dirname(current);
      if (parent === current) {
        throw new ResourceBoundaryError('No existing parent for path');
      }
      current = parent;
    }
    return fs.realpathSync(current);
  };
  PackageFiles = class PackageFiles {
    constructor(host, owner) {
      this.host = host;
      this.owner = owner;
    }

    resolve(input, operation) {
      var grant, lexical, packageRoot, realRoot, realTarget, resource;
      resource = relativeResource(input);
      this.host.enforce(this.owner, 'filesystem', operation, resource);
      packageRoot = fs.realpathSync(this.host.packageRoot(this.owner));
      lexical = path.resolve(packageRoot, resource);
      if (!inside(packageRoot, lexical)) {
        throw new ResourceBoundaryError('Path escapes the package');
      }
      grant = this.host.grantsFor(this.owner).files.find(function(item) {
        return (resource === item.root || resource.startsWith(`${item.root}/`)) && (operation === 'read' ? item.access !== 'write' : item.access !== 'read');
      });
      if (!grant) {
        throw new ResourceBoundaryError('No matching filesystem root');
      }
      realRoot = nearestExisting(path.resolve(packageRoot, grant.root));
      if (!inside(packageRoot, realRoot)) {
        throw new ResourceBoundaryError('Granted root resolves outside the package');
      }
      realTarget = operation === 'read' || fs.existsSync(lexical) ? fs.realpathSync(lexical) : nearestExisting(path.dirname(lexical));
      if (!inside(realRoot, realTarget)) {
        throw new ResourceBoundaryError('Resolved path escapes the granted root');
      }
      return lexical;
    }

    async readFile(input, options) {
      return (await fs.promises.readFile(this.resolve(input, 'read'), options));
    }

    async readdir(input, options) {
      return (await fs.promises.readdir(this.resolve(input, 'read'), options));
    }

    async writeFile(input, data, options) {
      return (await fs.promises.writeFile(this.resolve(input, 'write'), data, options));
    }

    async mkdir(input, options) {
      return (await fs.promises.mkdir(this.resolve(input, 'write'), options));
    }

  };
  PackageSecrets = class PackageSecrets {
    constructor(host, owner) {
      this.host = host;
      this.owner = owner;
    }

    get(name) {
      this.host.enforce(this.owner, 'secrets', 'read', name);
      return new SecretHandle(name, () => {
        return this.host.resolveSecret(name, this.owner);
      });
    }

  };
  PackageNetwork = class PackageNetwork {
    constructor(host, owner) {
      this.host = host;
      this.owner = owner;
    }

    async fetch(input, init = {}) {
      var fetcher, i, location, method, redirects, ref, response, url;
      url = new URLClass(input.toString());
      if (url.username || url.password) {
        throw new ResourceBoundaryError('Credentials in network URLs are not allowed');
      }
      method = String(init.method || 'GET').toUpperCase();
      fetcher = this.host.fetch || defaultFetch;
      if (typeof fetcher !== 'function') {
        throw new Error('No fetch implementation is available');
      }
      for (redirects = i = 0; i <= 10; redirects = ++i) {
        this.host.enforce(this.owner, 'network', 'request', url.origin, {
          method,
          redirect: redirects > 0
        });
        response = (await fetcher(url, {
          ...init,
          method,
          redirect: 'manual'
        }));
        if ((ref = response.status) !== 301 && ref !== 302 && ref !== 303 && ref !== 307 && ref !== 308) {
          return response;
        }
        location = response.headers.get('location');
        if (!location) {
          return response;
        }
        url = new URLClass(location, url);
        if (url.username || url.password) {
          throw new ResourceBoundaryError('Credentials in redirect URLs are not allowed');
        }
      }
      throw new ResourceBoundaryError('Network redirect limit exceeded');
    }

  };
  PackageProcess = require("./process.cjs")({fs, path, spawn, relativeResource, nearestExisting, inside, ProcessBoundaryError});
  return {PackageFiles, PackageNetwork, PackageProcess, PackageSecrets, ProcessBoundaryError, ResourceBoundaryError, SecretHandle};
};

module.exports = {createMediatedIO, SecretHandle, ResourceBoundaryError, ProcessBoundaryError, ...require("./events.cjs")};
