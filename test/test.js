/*globals describe,it*/
'use strict';

// REQUIRED MODULES FOR TESTING
// ============================================================================
var assert        = require('assert');
var ExtendPromise = require('../extendpromise.js');
var noop          = function () {};


// UTILS
// ============================================================================
var progressCount = 5;

function buildResolver(result, async) {
  var count = progressCount;

  function resolver(resolve, reject, next) {
    if (result === 'resolve' || count === 0) {
      if (async) { setTimeout(resolve, 0); }
      else { resolve(); }
    }

    else if (result === 'reject') {
      if (async) { setTimeout(reject, 0); }
      else { reject(); }
    }

    else {
      if (async) {
        setTimeout(function () {
          next(--count);
          resolver(resolve, reject, next);
        }, 0);
      } else {
        next(--count);
        resolver(resolve, reject, next);
      }
    }
  }

  return resolver;
}

function pendingCallStatus(method, isCalled, timeout) {
  return function (done) {
    method(function () {
      assert.ok(isCalled);
      done();
    });

    if (!isCalled) {
      setTimeout(function () {
        assert.ok(true);
        done();
      }, timeout);
    }
  };
}

// TESTS DEFINITION
// ============================================================================

// Basic check for the module signature
// ----------------------------------------------------------------------------
function extendPromiseSignature() {
  [
    {name: 'ExtendPromise',      val: ExtendPromise,      type: 'function'},
    {name: 'ExtendPromise.all',  val: ExtendPromise.all,  type: 'function'},
    {name: 'ExtendPromise.none', val: ExtendPromise.none, type: 'function'},
    {name: 'ExtendPromise.race', val: ExtendPromise.race, type: 'function'},
    {name: 'ExtendPromise.some', val: ExtendPromise.some, type: 'function'},
  ]
  .forEach(function (test) {
    var title = [test.name, ' should be "', test.type, '"'].join('');

    it(title, function () {
      assert.strictEqual(typeof test.val, test.type);
    });
  });
}

// Check for basic input and output of ExtendPromise methods
// ----------------------------------------------------------------------------
function extendPromiseIOThrow() {
  [
    {fn: ExtendPromise,      val: undefined, type: 'undefined'},
    {fn: ExtendPromise,      val: null,      type: 'null'},
    {fn: ExtendPromise,      val: true,      type: 'Boolean'},
    {fn: ExtendPromise,      val: 1,         type: 'Number'},
    {fn: ExtendPromise,      val: 'test',    type: 'String'},
    {fn: ExtendPromise,      val: {},        type: 'Object'},
    {fn: ExtendPromise,      val: [],        type: 'Array'},
    {fn: ExtendPromise.all,  val: undefined, type: 'undefined'},
    {fn: ExtendPromise.all,  val: null,      type: 'null'},
    {fn: ExtendPromise.all,  val: true,      type: 'Boolean'},
    {fn: ExtendPromise.all,  val: 1,         type: 'Number'},
    {fn: ExtendPromise.all,  val: 'test',    type: 'String'},
    {fn: ExtendPromise.all,  val: {},        type: 'Object'},
    {fn: ExtendPromise.all,  val: [],        type: 'empty Array'},
    {fn: ExtendPromise.all,  val: noop,      type: 'function'},
    {fn: ExtendPromise.none, val: undefined, type: 'undefined'},
    {fn: ExtendPromise.none, val: null,      type: 'null'},
    {fn: ExtendPromise.none, val: true,      type: 'Boolean'},
    {fn: ExtendPromise.none, val: 1,         type: 'Number'},
    {fn: ExtendPromise.none, val: 'test',    type: 'String'},
    {fn: ExtendPromise.none, val: {},        type: 'Object'},
    {fn: ExtendPromise.none, val: [],        type: 'empty Array'},
    {fn: ExtendPromise.none, val: noop,      type: 'function'},
    {fn: ExtendPromise.race, val: undefined, type: 'undefined'},
    {fn: ExtendPromise.race, val: null,      type: 'null'},
    {fn: ExtendPromise.race, val: true,      type: 'Boolean'},
    {fn: ExtendPromise.race, val: 1,         type: 'Number'},
    {fn: ExtendPromise.race, val: 'test',    type: 'String'},
    {fn: ExtendPromise.race, val: {},        type: 'Object'},
    {fn: ExtendPromise.race, val: [],        type: 'empty Array'},
    {fn: ExtendPromise.race, val: noop,      type: 'function'},
    {fn: ExtendPromise.some, val: undefined, type: 'undefined'},
    {fn: ExtendPromise.some, val: null,      type: 'null'},
    {fn: ExtendPromise.some, val: true,      type: 'Boolean'},
    {fn: ExtendPromise.some, val: 1,         type: 'Number'},
    {fn: ExtendPromise.some, val: 'test',    type: 'String'},
    {fn: ExtendPromise.some, val: {},        type: 'Object'},
    {fn: ExtendPromise.some, val: [],        type: 'empty Array'},
    {fn: ExtendPromise.some, val: noop,      type: 'function'}
  ]
  .forEach(function (test) {
    var title = [
      test.fn.name === 'ExtendPromise' ? '' : 'ExtendPromise.',
      test.fn.name,' should throw with ', test.type, ' input'
    ].join('');

    it(title, function () {
      assert.throws(function () {
        test.fn(test.val);
      }, Error);
    });
  });
}

function extendPromiseIOReturn() {
  [
    {fn: ExtendPromise,      val: noop},
    {fn: ExtendPromise.all,  val: [ExtendPromise(noop)]},
    {fn: ExtendPromise.none, val: [ExtendPromise(noop)]},
    {fn: ExtendPromise.race, val: [ExtendPromise(noop)]},
    {fn: ExtendPromise.some, val: [ExtendPromise(noop)]}
  ]
  .forEach(function (test) {
    var title = [
      'Output from ',
      test.fn.name === 'ExtendPromise' ? '' : 'ExtendPromise.',
      test.fn.name, ' is an instance of ExtendPromise'].join('');

    it(title, function () {
      var request = test.fn(test.val);

      assert.strictEqual(request instanceof ExtendPromise, true);
      assert.strictEqual(typeof request.then,     'function');
      assert.strictEqual(typeof request.catch,    'function');
      assert.strictEqual(typeof request.progress, 'function');
      assert.strictEqual(typeof request.cancel,   'function');
    });
  });
}

function extendPromiseIO() {
  describe('Expected input failure',  extendPromiseIOThrow);
  describe('Expected output success', extendPromiseIOReturn);
}

// Test basic Promise functionality
// ----------------------------------------------------------------------------
function extendPromiseBasic() {
  [
    { title: 'Check basic promise fulfilled',
      resolver: 'resolve', results: [
      {fn: 'catch',    isCalled: false},
      {fn: 'progress', isCalled: false},
      {fn: 'then',     isCalled: true }
    ]},
    { title: 'Check basic promise reject',
      resolver: 'reject', results: [
      {fn: 'catch',    isCalled: true },
      {fn: 'progress', isCalled: false},
      {fn: 'then',     isCalled: false}
    ]}
  ]
  .forEach(function (test) {
    describe(test.title, function () {
      describe('Test synchronous resolution', function () {
        var request = ExtendPromise(buildResolver(test.resolver, false));

        test.results.forEach(function (result) {
          var title = [result.fn, ' callback is ', result.isCalled ? '' : 'never ', 'call'].join('');
          it(title, pendingCallStatus(request[result.fn].bind(request), result.isCalled, 10));
        });
      });

      describe('Test asynchronous resolution', function () {
        var request = ExtendPromise(buildResolver(test.resolver, true));

        test.results.forEach(function (result) {
          var title = [result.fn, ' callback is ', result.isCalled ? '' : 'never ', 'call'].join('');
          it(title, pendingCallStatus(request[result.fn].bind(request), result.isCalled, 10));
        });
      });
    });
  });
}

// Test progress Promise functionality
// ----------------------------------------------------------------------------
function extendPromiseProgress() {
  it('Progress ' + progressCount + ' time then fulfilled', function (done) {
    this.timeout(50 * (progressCount + 1));

    var request = ExtendPromise(buildResolver('progress', true));
    var count   = 0;

    function resolve(isOk) {
      if (!isOk) {
        assert.ok(false, 'Progress should be fulfilled once progress is done');
      }

      else {
        assert.equal(count, progressCount);
      }

      done();
    }

    request.progress(function () {
      count++;
    })
    .then(function () {
      resolve(true);
    })
    .catch(function () {
      resolve(false);
    });
  });

  it('A sync call to the next() resolver does not trigger any progress callback', function (done) {
    this.timeout(50 * (progressCount + 1));

    var request = ExtendPromise(buildResolver('progress', false));
    var count   = 0;

    function resolve(isOk) {
      if (!isOk) {
        assert.ok(false, 'Progress should be fulfilled once progress is done');
      }

      else {
        assert.equal(count, 0);
      }

      done();
    }

    request.progress(function () {
      count++;
    })
    .then(function () {
      resolve(true);
    })
    .catch(function () {
      resolve(false);
    });
  });
}

// Test cancel Promise functionality
// ----------------------------------------------------------------------------
function extendPromiseCancel() {
  function simpleCanceling(value) {
    var isTrue      = value === true;
    var isFalse     = value === false;
    var isString    = typeof value === 'string';
    var isUndefined = typeof value === 'undefined';
    var isNaN       = Number.isNaN(value);
    var isArray     = Array.isArray(value);
    var isNull      = !value && typeof value === 'object';
    var isFunction  = typeof value === 'function';
    var isObject    = !isArray && !isNull && typeof value === 'object';
    var title = ['Call ExtendPromise.cancel(',
      isString ? '"': '',
      isNaN ? 'NaN' :
      isUndefined ? 'undefined' :
      isNull ? 'null' :
      isFunction ? 'function () {}' :
      isTrue ? 'true' :
      isFalse ? 'false' :
      isObject ? '{}' :
      isArray ? '[]'  : value,
      isString ? '"': '',
      ') (attempt to be fulfilled after 100ms)'].join('');

    it(title, function (done) {
      var request = ExtendPromise(function (resolve) {
        setTimeout(resolve, 100);
      });

      request
      .then(function () {
        assert.ok(false, 'A canceled promess should never be fulfilled');
        done();
      })
      .catch(function () {
        assert.ok(true);
        done();
      })
      .cancel(value);
    });
  }

  describe('Check calling cancel() with numeric values (numbers or string representing numbers)', function () {
    [-1, '-1', 0, '0', 30, '30'].forEach(simpleCanceling);
  });

  describe('Calling cancel() with non numeric value should act as if it where 0', function () {
    [noop, null, NaN, [], {}, true, false].forEach(simpleCanceling);
  });

  it('Cancel a fulfilled promise does not change its status', function (done) {
    var request = ExtendPromise(function (resolve) {
      resolve();
    });

    request
    .catch(function () {
      assert.ok(false, 'Canceling a fulfilled promess should not change its status');
      done();
    })
    .cancel(0);

    setTimeout(function () {
      assert.ok(true);
      done();
    }, 10);
  });

  it('Cancelling a promise is always asynchrounous', function (done) {
    var request = ExtendPromise(function (resolve) {
      setTimeout(resolve, 0);
    });

    request
    .then(function () {
      assert.ok(true);
      done();
    })
    .catch(function () {
      assert.ok(false, 'Canceling a fulfilled promess should not change its status');
      done();
    })
    .cancel(0);
  });
}

// RUN TESTS
// ============================================================================

describe('Check ExtendPromise module signature', extendPromiseSignature);
describe('Check ExtendPromise IO', extendPromiseIO);
describe('Check ExtendPromise basic resolution', extendPromiseBasic);
describe('Check ExtendPromise progress', extendPromiseProgress);
describe('Check ExtendPromise cancel', extendPromiseCancel);
