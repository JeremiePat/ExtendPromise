(function (name, factory) {
  'use strict';

  // NodeJS
  if (module && module.exports) {
    module.id      = name;
    module.exports = factory();
  }

  // CommonJS 1.1
  else if (module && exports) {
    module.id = name;
    exports   = factory();
  }

  // AMD modules
  else if (typeof define === 'function') {
    define(name, factory);
  }

  // Simple global binding for web browsers
  else if (window) {
    window[name] = factory();
  }
}('ExtendPromise', function () {
  'use strict';

  var PENDING_STATE = 'pending';
  var RESOLVE_STATE = 'resolve';
  var REJECT_STATE  = 'reject';


  // The Defered object
  // --------------------------------------------------------------------------

  // Create a new Defered object
  function Defered() {
    this.status  = PENDING_STATE;

    // Unique user facing objet with the usable API.
    this.promise = new DummyPromise();
    this.promise.then     = this.recorder.bind(this, RESOLVE_STATE);
    this.promise.catch    = this.recorder.bind(this, REJECT_STATE);
    this.promise.progress = this.recorder.bind(this, PENDING_STATE);
    this.promise.cancel   = this.cancel.bind(this);

    // Record of function to be executed
    this.cbChain = {};
    this.cbChain[PENDING_STATE] = [];
    this.cbChain[REJECT_STATE]  = [];
    this.cbChain[RESOLVE_STATE] = [];

    // Actual pile of callback to be executed
    this.execChain = [];
  }

  // Call when a resolution came up (fulfill, reject or progress)
  //
  // Note: All the arguments (except for the first one which is the type of the
  //       resolution) are passed to each callback function pending for the
  //       given type of resolution.
  //
  // * type <string>: One of the three possible resolution state:
  //                  PENDING_STATE (for progress),
  //                  RESOLVE_STATE (when the promise is fulfilled)
  //                  REJECT_STATE (when the promise fail)
  Defered.prototype.resolver = function (type) {
    if (this.status !== PENDING_STATE) { return; }

    // If there is already an exec chain in progress,
    // we loop asyncronously up to its full resolution.
    // This is necessary to avoid weird behaviors on progress
    if (this.execChain.length > 0) {
      var args = arguments;
      setTimeout((function () {
        this.resolver.apply(this, args);
      }).bind(this), 0);

      return;
    }

    this.status = type;
    this.result = Array.prototype.slice.call(arguments, 1);

    setTimeout(this.pileOut.bind(this), 0);
  };

  // Call to record a resolution callback function
  //
  // * action <string>: One of the three possible resolution state:
  //                    PENDING_STATE (for progress),
  //                    RESOLVE_STATE (when the promise is fulfilled)
  //                    REJECT_STATE (when the promise fail)
  // * fn <function>: A callback function to be called when the associate
  //                  resolution state is reached.
  //
  // return a DummyPromise
  Defered.prototype.recorder = function (action, fn) {
    if (this.status !== PENDING_STATE) {
      if (this.status === action) {
        fn.apply(null, this.result);
      }
    } else if (typeof fn === 'function') {
      if (this.execChain.length === 0) {
        this.cbChain[action].push(fn);
      } else {
        this.execChain.push(fn);
      }
    }

    return this.promise;
  };

  // Call to cancel the promise
  //
  // Note: When a promise is canceled, it is rejected. However, canceling is
  //       asynchronous, which means that when the cancel method is called,
  //       there is no gurantee the promise will be reject. It can be fulfilled
  //       between the call to cancel and the actual cancel attempt.
  //
  // * time <number>: A delay in millisecond before triying to cancel the
  //                  promise, default to 0.
  Defered.prototype.cancel = function (time) {
    var delay = time > 0 ? Number(time) : 0;

    setTimeout(this.resolver.bind(this, REJECT_STATE, 'canceled'), delay);

    return this.promise;
  };

  // Launch and manage the chain of callback to be run
  Defered.prototype.pileOut = function () {
    if (this.execChain.length === 0) {
      this.execChain = this.status !== PENDING_STATE ?
                       this.cbChain[this.status] :
                       this.cbChain[this.status].map(function (fn) {
                         return fn;
                       });
    }

    var fn = this.execChain.shift();

    if (fn) {
      fn.apply(null, this.result);

      if (this.execChain.length > 0) {
        setTimeout(this.pileOut.bind(this), 0);
      }
    }
  };


  // The ExtendPromise factory
  // --------------------------------------------------------------------------

  // Creates an ExtendPromise
  //
  // Note: ExtendPromise is a factory, not a constructor,
  //       it's useless to call `new` with it.
  //
  // * fn <function> The function where the logic to resolve the promise is
  //                 define by the user. It get 3 input parameters: resolve,
  //                 reject, next. The first 2 ones fulfill the promise as
  //                 success or error. The third one is used to push a progress
  //                 status.
  function ExtendPromise(fn) {
    if (typeof fn !== 'function') {
      throw new Error('ExtendPromise expect a function as its first argument');
    }

    var defer = new Defered();

    fn(
      defer.resolver.bind(defer, RESOLVE_STATE),
      defer.resolver.bind(defer, REJECT_STATE),
      defer.resolver.bind(defer, PENDING_STATE)
    );

    return defer.promise;
  }

  // Returns an ExtendPromise that will resolve once all
  // the input ExtendPromise would have succeed
  ExtendPromise.all = function all(list) {
    var defer = new Defered();
    var count = 0;

    if (!Array.isArray(list) || list.length === 0) {
      defer.resolver(REJECT_STATE);
      throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
    }

    list.forEach(function (p) {
      if (typeof p.catch    !== 'function' &&
          typeof p.then     !== 'function') {
        throw new Error('ExtendPromise.all expect an array of Promise like objects');
      }

      p.catch(function () {
        defer.resolver(REJECT_STATE);
      });

      p.then(function () {
        count += 1;
        if (count === list.length) {
          defer.resolver(RESOLVE_STATE);
        }

        else {
          defer.resolver(PENDING_STATE, count);
        }
      });
    });

    return defer.promise;
  };

  // Returns an ExtendPromise that will resolve or reject
  // as soon as one of the input ExtendPromise succeed
  ExtendPromise.race = function race(list) {
    var defer = new Defered();

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('ExtendPromise.race expect an array of Promise like objects');
    }

    list.forEach(function (p) {
      if (typeof p.catch !== 'function' && typeof p.then !== 'function') {
        throw new Error('ExtendPromise.race expect an array of Promise like objects');
      }

      p.then(function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(RESOLVE_STATE);
        defer.resolver.apply(defer, args);
      });

      p.catch(function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(REJECT_STATE);
        defer.resolver.apply(defer, args);
      });
    });

    return defer.promise;
  };

  // Returns an ExtendPromise that will resolve as soon as
  // one of the input ExtendPromise succeed
  ExtendPromise.some = function some(list) {
    var defer = new Defered();
    var count = 0;

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('ExtendPromise.some expect an array of Promise like objects');
    }

    list.forEach(function (p) {
      if (typeof p.catch !== 'function' && typeof p.then !== 'function') {
        throw new Error('ExtendPromise.some expect an array of Promise like objects');
      }

      p.then(function () {
        defer.resolver(RESOLVE_STATE);
      });

      p.catch(function () {
        count += 1;
        if (count === list.length) {
          defer.resolver(REJECT_STATE);
        }
      });
    });

    return defer.promise;
  };

  // Returns an ExtendPromise that will resolved once all
  // the input ExtendPromise would have failed
  ExtendPromise.none = function none(list) {
    var defer = new Defered();
    var count = 0;

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
    }

    list.forEach(function (p) {
      if (typeof p.catch    !== 'function' &&
          typeof p.then     !== 'function' &&
          typeof p.progress !== 'function') {
        throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
      }

      p.then(function () {
        defer.resolver(REJECT_STATE);
      });

      p.catch(function () {
        count += 1;
        if (count === list.length) {
          defer.resolver(RESOLVE_STATE);
        }

        else {
          defer.resolver(PENDING_STATE, count);
        }
      });
    });

    return defer.promise;
  };

  // Returns an ExtendPromise object that is rejected with the given reason.
  ExtendPromise.reject = function reject(reason) {
    var defer = new Defered();
    defer.resolver(REJECT_STATE, reason);
    return defer.promise;
  };

  // Returns an ExtendPromise object that is resolved with the given value.
  ExtendPromise.resolve = function resolve(value) {
    var defer = new Defered();

    if (value && typeof value.then === 'function') {
      value.then(function (result) {
        defer.resolver(RESOLVE_STATE, result);
      });
    } else {
      defer.resolver(RESOLVE_STATE, value);
    }

    return defer.promise;
  };


  // Prototype chain
  // --------------------------------------------------------------------------
  // Only for people who wish to test `ExtendPromise instanceof Promise`
  // but ExtendPromise is not meant to be extensible through prototype
  if (typeof Promise !== 'undefined') {
    ExtendPromise.prototype = Object.create(Promise.prototype);
  }

  function DummyPromise() {}
  DummyPromise.prototype = Object.create(ExtendPromise.prototype);


  // Expose the API to the outside world
  // --------------------------------------------------------------------------
  return ExtendPromise;
}));
