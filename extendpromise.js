(function () {
  'use strict';

  var PENDING_STATE = 'pending';
  var RESOLVE_STATE = 'resolve';
  var REJECT_STATE  = 'reject';


  function Defered() {
    this.status  = PENDING_STATE;

    // Unique user facing objet with the usable API.
    this.promise = new DummyPromise();
    this.promise['then']     = this.action.bind(this, RESOLVE_STATE);
    this.promise['catch']    = this.action.bind(this, REJECT_STATE);
    this.promise['progress'] = this.action.bind(this, PENDING_STATE);
    this.promise['cancel']   = this.cancel.bind(this);

    // Record of function to be executed
    this.cbChain = {};
    this.cbChain[PENDING_STATE] = [];
    this.cbChain[REJECT_STATE]  = [];
    this.cbChain[RESOLVE_STATE] = [];

    // Actual pile of callback to be executed
    this.execChain = [];
  }

  Defered.prototype.resolver = function (type) {
    if (this.status !== PENDING_STATE) { return; }

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

  Defered.prototype.action   = function (action, fn) {
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

  Defered.prototype.cancel   = function (time) {
    var delay = time === +time && time > 0 ? time : 0;

    setTimeout(this.resolver.bind(this, REJECT_STATE), delay);

    return this.promise;
  };

  Defered.prototype.pileOut  = function () {
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
        setTimeout(this.pileOut.bind(this), 0)
      }
    }
  };



  // Create an ExtendPromise
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

  // Return an ExtendPromise that will resolve once all
  // the input ExtendPromise would have succeed
  ExtendPromise.all = function (list) {
    var defer = new Defered();
    var count = 0;

    if (!Array.isArray(list) || list.length === 0) {
      defer.resolver(REJECT_STATE);
      throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
    }

    list.forEach(function (i, p) {
      if (typeof p.error !== 'function' &&
          typeof p.then !== 'function'  &&
          typeof p.progress !== 'function') {
        throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
      }

      p.error(function () {
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

  // Return an ExtendPromise that will resolve or reject
  // as soon as one of the input ExtendPromise succeed
  ExtendPromise.race = function(list) {
    var defer = new Defered();

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
    }

    list.forEach(function (i, p) {
      if (typeof p.error !== 'function' && typeof p.then !== 'function') {
        throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
      }

      p.then(function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(RESOLVE_STATE);
        defer.resolver.apply(defer, args);
      });

      p.error(function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(REJECT_STATE);
        defer.resolver.apply(defer, args);
      });
    });

    return defer.promise;
  };

  // Return an ExtendPromise that will resolve as soon as
  // one of the input ExtendPromise succeed
  ExtendPromise.some = function (list) {
    var defer = new Defered();
    var count = 0;

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
    }

    list.forEach(function (i, p) {
      if (typeof p.error !== 'function' && typeof p.then !== 'function') {
        throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
      }

      p.then(function () {
        defer.resolver(RESOLVE_STATE);
      });

      p.error(function () {
        count += 1;
        if (count === list.length) {
          defer.resolver(REJECT_STATE);
        }
      });
    });

    return defer.promise;
  };

  // Return an ExtendPromise that will resolved once all
  // the input ExtendPromise would have failed
  ExtendPromise.none = function (list) {
    var defer = new Defered();
    var count = 0;

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
    }

    list.forEach(function (i, p) {
      if (typeof p.error !== 'function' &&
          typeof p.then !== 'function'  &&
          typeof p.progress !== 'function') {
        throw new Error('ExtendPromise.all expect an array of ExtendPromise objects');
      }

      p.then(function () {
        defer.resolver(REJECT_STATE);
      });

      p.error(function () {
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

  // Only for people who wish to do `foo instanceof Promise`
  // but ExtendPromise is not meant to be extensible through prototype
  if (Promise) {
    ExtendPromise.prototype = Object.create(Promise.prototype);
  }


  function DummyPromise() {}
  DummyPromise.prototype = Object.create(ExtendPromise.prototype);

  // Expose the API to the outside world
  window.ExtendPromise = ExtendPromise;
})();
