/*globals describe,it*/
'use strict';

// REQUIRED MODULES FOR TESTING
// ============================================================================
var assert          = require('assert');
var ExtendPromise   = require('../extendpromise.js');

// PARAMS
// ----------------------------------------------------------------------------
var noop            = function () {};
var cancelFulfilled = 20;


// UTILS
// ============================================================================
function buildResolver(result, async, count) {
  count = count === +count && count >= 0 ? count :  1;
  async = async === +async && async >= 0 ? async : -1;

  function resolver(resolve, reject, next) {
    if (result === 'resolve' || count === 0) {
      if (async > -1) { setTimeout(resolve, async); }
      else { resolve(); }
    }

    else if (result === 'reject') {
      if (async > -1) { setTimeout(reject, async); }
      else { reject(); }
    }

    else {
      if (async > -1) {
        setTimeout(function () {
          next(--count);
          resolver(resolve, reject, next);
        }, async);
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

// Runner
// ----------------------------------------------------------------------------
function testRunner(test) {
  if (test.tests) {
    describe(test.title, function () {
      testRunner(test.tests);
    });
  } else if (Array.isArray(test)) {
    test.forEach(function (test) {
      if (test.tests) {
        describe(test.title, function () {
          testRunner(test.tests);
        });
      } else {
        it(test.title, function (done) {
          test.test(test.value, test.expect, done, this);
        });
      }
    });
  }
}

// Basic test function
// ----------------------------------------------------------------------------

function chkType(value, expect, done) {
  assert.strictEqual(typeof value, expect);
  done();
}

function chkSuccessInstance(value, expect, done) {
  assert.strictEqual(value(expect) instanceof ExtendPromise, true);
  done();
}

function chkFailInstance(value, expect, done) {
  assert.throws(function () { value(expect); }, Error);
  done();
}

function chkThenResolution(value, expect, done) {
  var request = ExtendPromise(value);
  pendingCallStatus(request.then.bind(request), expect, 10)(done);
}

function chkCatchResolution(value, expect, done) {
  var request = ExtendPromise(value);
  pendingCallStatus(request.catch.bind(request), expect, 10)(done);
}

function chkProgressResolution(value, expect, done) {
  var request = ExtendPromise(value);
  pendingCallStatus(request.progress.bind(request), expect, 10)(done);
}

function chkProgress(value, expect, done, context) {
  context.timeout(50 * (expect + 1));

  var request = ExtendPromise(value);
  var count = 0;

  function resolve(isOk) {
    if (!isOk) {
      assert.ok(false, 'Progress should be fulfilled once progress is done');
    }

    else {
      assert.equal(count, expect);
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
}

function chkCancelFulfilled(value, expect, done) {
  ExtendPromise(expect)
    .cancel(value)
    .then(function () {
      assert.ok(true);
      done();
    })
    .catch(function () {
      assert.ok(false, 'Canceling a fulfilled promess should not change its status');
      done();
    });
}

function chkCancelReject(value, expect, done) {
  ExtendPromise(expect)
    .cancel(value)
    .then(function () {
      assert.ok(false, 'A canceled promess should never be fulfilled');
    })
    .catch(function () {
      assert.ok(true);
    });

  setTimeout(done, cancelFulfilled + 5);
}


// TESTS DEFINITION
// ============================================================================

testRunner(
  [ { title: 'ExtendPromise',
    tests:
      [ { title: 'ExtendPromise is a function',
        test  : chkType,
        value : ExtendPromise,
        expect: 'function'
      },{ title: 'ExtendPromise return an ExtendPromise',
        test  : chkSuccessInstance,
        value : ExtendPromise,
        expect: noop
      },{ title: 'ExtendPromise throw with undefined',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: undefined
      },{ title: 'ExtendPromise throw with null',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: null
      },{ title: 'ExtendPromise throw with Boolean (true)',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: true
      },{ title: 'ExtendPromise throw with Boolean (false)',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: false
      },{ title: 'ExtendPromise throw with Number (1)',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: 1
      },{ title: 'ExtendPromise throw with Number (0)',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: 0
      },{ title: 'ExtendPromise throw with String ("test")',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: 'test'
      },{ title: 'ExtendPromise throw with String ("")',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: ''
      },{ title: 'ExtendPromise throw with Object ({})',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: {}
      },{ title: 'ExtendPromise throw with Array ([])',
        test  : chkFailInstance,
        value : ExtendPromise,
        expect: []
      } ]
  },{ title: 'ExtendPromise.all',
    tests:
      [ { title: 'ExtendPromise.all is a function',
        test  : chkType,
        value : ExtendPromise.all,
        expect: 'function'
      },{ title: 'ExtendPromise.all return an ExtendPromise',
        test  : chkSuccessInstance,
        value : ExtendPromise.all,
        expect: [ExtendPromise(noop)]
      },{ title: 'ExtendPromise.all throw with undefined',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: undefined
      },{ title: 'ExtendPromise.all throw with null',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: null
      },{ title: 'ExtendPromise.all throw with Boolean (true)',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: true
      },{ title: 'ExtendPromise.all throw with Boolean (false)',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: false
      },{ title: 'ExtendPromise.all throw with Number (1)',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: 1
      },{ title: 'ExtendPromise.all throw with Number (0)',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: 0
      },{ title: 'ExtendPromise.all throw with String ("test")',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: 'test'
      },{ title: 'ExtendPromise.all throw with String ("")',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: ''
      },{ title: 'ExtendPromise.all throw with Object ({})',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: {}
      },{ title: 'ExtendPromise.all throw with empty Array ([])',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: []
      },{ title: 'ExtendPromise.all throw with function',
        test  : chkFailInstance,
        value : ExtendPromise.all,
        expect: noop
      } ]
  },{ title: 'ExtendPromise.none',
    tests:
      [ { title: 'ExtendPromise.none is a function',
        test  : chkType,
        value : ExtendPromise.none,
        expect: 'function'
      },{ title: 'ExtendPromise.none return an ExtendPromise',
        test  : chkSuccessInstance,
        value : ExtendPromise.none,
        expect: [ExtendPromise(noop)]
      },{ title: 'ExtendPromise.none throw with undefined',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: undefined
      },{ title: 'ExtendPromise.none throw with null',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: null
      },{ title: 'ExtendPromise.none throw with Boolean (true)',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: true
      },{ title: 'ExtendPromise.none throw with Boolean (false)',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: false
      },{ title: 'ExtendPromise.none throw with Number (1)',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: 1
      },{ title: 'ExtendPromise.none throw with Number (0)',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: 1
      },{ title: 'ExtendPromise.none throw with String ("test")',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: 'test'
      },{ title: 'ExtendPromise.none throw with String ("")',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: ''
      },{ title: 'ExtendPromise.none throw with Object ({})',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: {}
      },{ title: 'ExtendPromise.none throw with empty Array ([])',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: []
      },{ title: 'ExtendPromise.none throw with function',
        test  : chkFailInstance,
        value : ExtendPromise.none,
        expect: noop
      } ]
  },{ title: 'ExtendPromise.race',
    tests:
      [ { title: 'ExtendPromise.race is a function',
        test  : chkType,
        value : ExtendPromise.race,
        expect: 'function'
      },{ title: 'ExtendPromise.race return an ExtendPromise',
        test  : chkSuccessInstance,
        value : ExtendPromise.race,
        expect: [ExtendPromise(noop)]
      },{ title: 'ExtendPromise.race throw with undefined',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: undefined
      },{ title: 'ExtendPromise.race throw with null',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: null
      },{ title: 'ExtendPromise.race throw with Boolean (true)',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: true
      },{ title: 'ExtendPromise.race throw with Boolean (false)',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: false
      },{ title: 'ExtendPromise.race throw with Number (1)',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: 1
      },{ title: 'ExtendPromise.race throw with Number (0)',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: 0
      },{ title: 'ExtendPromise.race throw with String ("test")',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: 'test'
      },{ title: 'ExtendPromise.race throw with String ("")',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: ''
      },{ title: 'ExtendPromise.race throw with Object ({})',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: {}
      },{ title: 'ExtendPromise.race throw with empty Array ([])',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: []
      },{ title: 'ExtendPromise.race throw with function',
        test  : chkFailInstance,
        value : ExtendPromise.race,
        expect: noop
      } ]
  },{ title: 'ExtendPromise.some',
    tests:
      [ { title: 'ExtendPromise.some is a function',
        test  : chkType,
        value : ExtendPromise.some,
        expect: 'function'
      },{ title: 'ExtendPromise.some return an ExtendPromise',
        test  : chkSuccessInstance,
        value : ExtendPromise.some,
        expect: [ExtendPromise(noop)]
      },{ title: 'ExtendPromise.some throw with undefined',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: undefined
      },{ title: 'ExtendPromise.some throw with null',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: null
      },{ title: 'ExtendPromise.some throw with Boolean (true)',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: true
      },{ title: 'ExtendPromise.some throw with Boolean (false)',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: false
      },{ title: 'ExtendPromise.some throw with Number (1)',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: 1
      },{ title: 'ExtendPromise.some throw with Number (0)',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: 0
      },{ title: 'ExtendPromise.some throw with String ("test")',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: 'test'
      },{ title: 'ExtendPromise.some throw with String ("")',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: ''
      },{ title: 'ExtendPromise.some throw with Object ({})',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: {}
      },{ title: 'ExtendPromise.some throw with empty Array ([])',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: []
      },{ title: 'ExtendPromise.some throw with function',
        test  : chkFailInstance,
        value : ExtendPromise.some,
        expect: noop
      } ]
  },{ title: 'promise.then',
    tests:
      [ { title: 'Record callback is called when the promise is fulfilled (synch)',
        test  : chkThenResolution,
        value : buildResolver('resolve', false),
        expect: true
      },{ title: 'Record callback is called when the promise is fulfilled (asynch)',
        test  : chkThenResolution,
        value : buildResolver('resolve', 0),
        expect: true
      },{ title: 'Record callback is NOT called when the promise is rejected (synch)',
        test  : chkThenResolution,
        value : buildResolver('reject', false),
        expect: false
      },{ title: 'Record callback is NOT called when the promise is rejected (asynch)',
        test  : chkThenResolution,
        value : buildResolver('reject', 0),
        expect: false
      }]
  },{ title: 'promise.catch',
    tests:
      [ { title: 'Record callback is called when the promise is rejected (synch)',
        test  : chkCatchResolution,
        value : buildResolver('reject', false),
        expect: true
      },{ title: 'Record callback is called when the promise is rejected (asynch)',
        test  : chkCatchResolution,
        value : buildResolver('reject', 0),
        expect: true
      },{ title: 'Record callback is NOT called when the promise is fulfilled (synch)',
        test  : chkCatchResolution,
        value : buildResolver('resolve', false),
        expect: false
      },{ title: 'Record callback is NOT called when the promise is fulfilled (asynch)',
        test  : chkCatchResolution,
        value : buildResolver('resolve', 0),
        expect: false
      }]
  },{ title: 'promise.progress',
    tests:
      [ { title: 'Record callback is NOT called when the promise is just fulfilled (synch)',
        test  : chkProgressResolution,
        value : buildResolver('reject', false),
        expect: false
      },{ title: 'Record callback is NOT called when the promise is just fulfilled (asynch)',
        test  : chkProgressResolution,
        value : buildResolver('reject', 0),
        expect: false
      },{ title: 'Record callback is NOT called when the promise is just rejected (synch)',
        test  : chkProgressResolution,
        value : buildResolver('resolve', false),
        expect: false
      },{ title: 'Record callback is NOT called when the promise is just rejected (asynch)',
        test  : chkProgressResolution,
        value : buildResolver('resolve', 0),
        expect: false
      },{ title: 'Progress 5 times then fulfilled',
        test  : chkProgress,
        value : buildResolver('progress', 0, 5),
        expect: 5
      },{ title: 'Progress 5 times then fulfilled',
        test  : chkProgress,
        value : buildResolver('progress', 0, 5),
        expect: 5
      },{ title: 'Do not progress when the promised is fulfilled synchronously',
        test  : chkProgress,
        value : buildResolver('progress', false, 5),
        expect: 0
      }]
  },{ title: 'promise.cancel',
    tests:
      [ { title: 'Cancel a synchrounous fulfilled promise does not change its status',
        test  : chkCancelFulfilled,
        value : 0,
        expect: buildResolver('resolve', false)
      },{ title: 'Cancel an asynchrounous fulfilled promise does not change its status',
        test  : chkCancelFulfilled,
        value : 20,
        expect: buildResolver('resolve', 10)
      },{ title: 'Cancel is always asynchrounous',
        test  : chkCancelFulfilled,
        value : 0,
        expect: buildResolver('resolve', 0)
      },{ title: 'Cancel with 0 - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : 0,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a positive number (10) - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : 10,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a string ("10") - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : '10',
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a negative number (-1) - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : -1,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a string ("") - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : '',
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a string ("0") - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : '0',
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a string ("-1") - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : '-1',
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a function - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : noop,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with null - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : null,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with undefined - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : undefined,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with NaN - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : 1/0,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with an Object ({}) - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : {},
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with an Array ([]) - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : '10',
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a boolean (true) - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : true,
        expect: buildResolver('resolve', cancelFulfilled)
      },{ title: 'Cancel with a boolean (false) - try to fulfilled after ' + cancelFulfilled + 'ms',
        test  : chkCancelReject,
        value : false,
        expect: buildResolver('resolve', cancelFulfilled)
      } ]
  } ]
);
