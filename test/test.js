/*globals describe,it*/
'use strict';

// REQUIRED MODULES FOR TESTING
// ============================================================================
var assert = require('assert');
var ExtendPromise = require('../extendpromise.js');
var noop = function () {};


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
function extendPromiseThenSync() {
  var request = ExtendPromise(function (resolve) {
    resolve();
  });

  it('"then" callback is called synchronously', function () {
    request.then(function () {
      assert.ok(true, 'Instant call');
    });
  });

  it('"catch" callback is never call', function (done) {
    request.catch(function () {
      assert.ok(false, 'This sould not happen');
      done();
    });

    setTimeout(done, 30);
  });

  it('"progress" callback is never call', function (done) {
    request.progress(function () {
      assert.ok(false, 'This sould not happen');
      done();
    });

    setTimeout(done, 30);
  });
}

function extendPromiseThenAsync() {
  var request = ExtendPromise(function (resolve) {
    setTimeout(resolve, 100);
  });

  it('"then" callback is called asynchronously', function (done) {
    request.then(function () {
      assert.ok(true, 'Async call');
      done();
    });
  });

  it('"catch" callback is never call', function (done) {
    request.catch(function () {
      assert.ok(false, 'This sould not happen');
      done();
    });

    setTimeout(done, 30);
  });

  it('"progress" callback is never call', function (done) {
    request.progress(function () {
      assert.ok(false, 'This sould not happen');
      done();
    });

    setTimeout(done, 30);
  });
}

function extendPromiseThen() {
  describe('Basic promise syncronously resolved', extendPromiseThenSync);
  describe('Basic promise asyncronously resolved', extendPromiseThenAsync);
}

// RUN TESTS
// ============================================================================

describe('Check ExtendPromise module signature', extendPromiseSignature);
describe('Check ExtendPromise IO', extendPromiseIO);
describe('Check ExtendPromise being fulfilled', extendPromiseThen);
