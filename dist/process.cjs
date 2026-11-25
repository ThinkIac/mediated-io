// Process policy remains independent of the native spawn implementation.
var indexOf = [].indexOf;

module.exports = function({fs, path, spawn, relativeResource, nearestExisting, inside, ProcessBoundaryError}) {
  var PackageProcess, argsMatch, cwdMatch;
  argsMatch = function(pattern, args) {
    return pattern.length === args.length && pattern.every(function(value, index) {
      return value === '*' || value === args[index];
    });
  };
  cwdMatch = function(roots, cwd) {
    return roots.some(function(root) {
      return cwd === root || cwd.startsWith(`${root}/`);
    });
  };
  return PackageProcess = class PackageProcess {
    constructor(host, owner) {
      this.host = host;
      this.owner = owner;
    }

    spawn(executable, args = [], options = {}) {
      var child, cwd, cwdRoot, env, grant, lexicalCwd, packageRoot, realCwd, realCwdRoot, scope;
      this.host.enforce(this.owner, 'process', 'spawn', executable);
      if (options.shell) {
        throw new ProcessBoundaryError('Shell execution is not allowed');
      }
      if (args.some(function(arg) {
        return typeof arg !== 'string' || arg.includes('\0');
      })) {
        throw new ProcessBoundaryError('Process arguments must be safe strings');
      }
      cwd = relativeResource(options.cwd || '.');
      env = options.env || {};
      grant = this.host.grantsFor(this.owner).process.find(function(item) {
        return item.executable === executable && argsMatch(item.args, args) && cwdMatch(item.cwd, cwd) && Object.keys(env).every(function(key) {
          return indexOf.call(item.env, key) >= 0;
        });
      });
      if (!grant) {
        throw new ProcessBoundaryError('Executable, arguments, cwd or environment are outside the declared process grant');
      }
      packageRoot = fs.realpathSync(this.host.packageRoot(this.owner));
      lexicalCwd = path.resolve(packageRoot, cwd);
      cwdRoot = grant.cwd.find(function(root) {
        return cwd === root || cwd.startsWith(`${root}/`);
      });
      if (!cwdRoot) {
        throw new ProcessBoundaryError('Process cwd is outside the declared roots');
      }
      realCwdRoot = nearestExisting(path.resolve(packageRoot, cwdRoot));
      realCwd = fs.realpathSync(lexicalCwd);
      if (!(inside(packageRoot, realCwdRoot) && inside(realCwdRoot, realCwd))) {
        throw new ProcessBoundaryError('Resolved process cwd escapes the package grant');
      }
      child = spawn(executable, args, {
        ...options,
        cwd: lexicalCwd,
        env: {...env},
        shell: false
      });
      scope = this.host.activeScope(this.owner);
      if (!scope) {
        child.kill();
        throw new ProcessBoundaryError('Package process requires an active EffectScope');
      }
      this.host.trackProcess(scope, child, path.basename(executable));
      return child;
    }

  };
};
