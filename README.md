# ExtendPromise

The ExtendPromise library provide a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) like object (meaning with the same interface and the same basic behaviors) with the following extra powers:

* ExtendPromise can be canceled
* ExtendPromise allow to track fulfillment progress
* ExtendPromise provides extra resolution methods for list of Promises

This library is really in its infancy, so if you want a robust Promise library ready for production code you should consider looking at the [bluebird](https://github.com/petkaantonov/bluebird) or [RSVP](https://github.com/tildeio/rsvp.js) libraries.


# Support

This library can be used either as a Node.js module (npm support to come), an AMD module or within a browser (bower support to come).

Node.js or Browser support required the following ES5 features:

* Array.isArray
* Array.prototype.map
* Function.prototype.bind

All those features can be [polyfilled](https://github.com/es-shims/es5-shim) as necessary but this library doesn't provide any polyfill of its own, this is up to you.


# Documentation

## API overview

* `<extendPromiseInstance> ExtendPromise(<function> resolver)`

* `<extendPromiseInstance> ExtendPromise.all(<Array> list)`
* `<extendPromiseInstance> ExtendPromise.race(<Array> list)`
* `<extendPromiseInstance> ExtendPromise.some(<Array> list)`
* `<extendPromiseInstance> ExtendPromise.none(<Array> list)`
* `<extendPromiseInstance> ExtendPromise.reject(<String> reason)`
* `<extendPromiseInstance> ExtendPromise.resolve(<any> value)`

* `<extendPromiseInstance> <extendPromiseInstance>.then(<function> callback)`
* `<extendPromiseInstance> <extendPromiseInstance>.catch(<function> callback)`
* `<extendPromiseInstance> <extendPromiseInstance>.progress(<function> callback)`
* `<extendPromiseInstance> <extendPromiseInstance>.cancel(<number> timeout)`

## The ExtendPromise function

The ExtendPromise function is a factory, not a constructor. It means that you can use it without the `new` operator.

```javascript
var promise = ExtendPromise(function (resolve, reject, next) {
  /* Do your stuff here */
})
```

The ExtendPromise function expect a callback function as it's first argument. This callback function will get three parameters:

1. A resolve function to be called once you want to fulfilled the promise
2. A reject function to be called once you want to reject the promise
3. A next function to be called to provide a progress status before the promise is fulfilled or rejected. This last function can be called as much as needed as long as the promise is not fulfilled nor rejected.

```javascript
var toBeFulfilled = ExtendPromise(function (resolve, reject, next) {
  var start    = Date.now();
  var progress = setInterval(function () {
    next(Date.now() - start);
  }, 100);

  setTimeout(function () {
    clearInterval(progress);
    resolve("I'm done!");
  }, 1000); // Fulfilled after 1 second;
});

toBeFulfilled
  .progress(function (time) {
    console.log('In progress for ' + time + 'ms');
  })
  .then(function (result) {
    console.log(result); // I'm done!
  });
```


## The ExtendPromise resolver functions

The ExtendPromise factory provide some convenient resolver methods to handle groups of Promise objects.

### ExtendPromise.all

This method expect an Array of Promise like objects (meaning with a `then` and `catch` method). It returns a promise that will be fulfilled once all the provide Promise will be fulfilled.

Each time one of the provide Promise is fulfilled a progress notification is sent indicating how many Promise have been fulfilled so far.

```javascript
function randomResolver(resolve) {
  // Sometimes between 500 and 2000 milliseconds
  var timing = Math.floor(Math.random() * (2000 - 500) + 500);
  setTimeout(resolve, timing);
}

var list = [
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver)
];

var expectAll = ExtendPromise.all(list);

expectAll
  .then(function () {
    console.log('All promises have been fulfilled');
  })
  .catch(function () {
    console.log('One of the promise has been rejected');
  })
  .progress(function (nbr) {
    var percent = Math.ceil(100 * nbr / list.length);
    console.log(percent + '% done so far');
  });
```

### ExtendPromise.race

This method expect an Array of Promise like objects (meaning with a `then` and `catch` method). It returns a promise that will be fulfilled or reject as soon as one of the provide Promise is fulfilled or reject.

```javascript
function randomResolver(resolve, reject) {
  // Sometimes between 500 and 2000 milliseconds
  var timeToResolve = Math.floor(Math.random() * (2000 - 500) + 500);
  var timeToReject  = Math.floor(Math.random() * (2000 - 500) + 500);

  setTimeout(resolve, timeToResolve);
  setTimeout(reject,  timeToReject);
}

var list = [
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver)
];

var expectRace = ExtendPromise.race(list);

expectRace
  .then(function () {
    console.log('One of the promise has been fulfilled');
  })
  .catch(function () {
    console.log('One of the promise has been rejected');
  });
```


### ExtendPromise.some

This method expect an Array of Promise like objects (meaning with a `then` and `catch` method). It returns a promise that will be fulfilled as soon as one of the provide Promise is fulfilled. If all the promises are rejected, the returned promise is also rejected.

```javascript
function randomResolver(resolve, reject) {
  // Sometimes between 500 and 2000 milliseconds
  var timeToResolve = Math.floor(Math.random() * (2000 - 500) + 500);
  var timeToReject  = Math.floor(Math.random() * (2000 - 500) + 500);

  setTimeout(resolve, timeToResolve);
  setTimeout(reject,  timeToReject);
}

var list = [
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver),
  ExtendPromise(randomResolver)
];

var expectSome = ExtendPromise.some(list);

expectSome
  .then(function () {
    console.log('One of the promise has been fulfilled');
  })
  .catch(function () {
    console.log('All the promises have been rejected');
  });
```


### ExtendPromise.none

This method expect an Array of Promise like objects (meaning with a `then` and `catch` method). It's the opposite of `ExtendPromise.all`. It will be fulfilled only if all Promise are rejected. It means that it will be rejected as soon as one of the Promise is fulfilled.

### ExtendPromise.reject

This method return an ExtendPromise which is fulfilled no matter what.

### ExtendPromise.resolve

This method return an ExtendPromise which is reject no matter what.

## ExtendPromise instances

Each call to the ExtendPromise factory or to one of the ExtendPromise resolver method will return an ExtendPromise object with the following chainable methods (meaning they return the ExtendPromise object itself):

* [`then`](#then)
* [`catch`](#catch)
* [`progress`](#progress)
* [`cancel`](#cancel)

For the then, catch and progress method, each callback recorded with those function is guaranty to be executed in the order it is recorded.

### then
Record a callback function to be executed once the promise is fulfilled.

### catch

Record a callback function to be executed once the promise is rejected.

### progress

Record a callback function to be executed each time an update notification is provided.

### cancel

A call to this method will try to cancel the ExtendPromise. It expect a number of millisecond as its first argument, it's a convenient way to define a timeout for the Promise. If the cancellation is done before the Promise is fulfilled, then it is rejected.

> _Note that the cancel attempt is asynchronous, therefor a call to `cancel` with a value of `0` (or no value) doesn't guarantee the Promise will be rejected._

## Full example

In this example we will implement a very simple fetch function to get any HTTP resource.

```javascript
function fetch(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);

  return ExtendPromise(function (resolve, reject, progress) {
    xhr.onprogress = function (e) {
      var percent = (e.position / e.totalSize) * 100;
      progress(percent);
    }

    xhr.onabort = function () {
      reject('Operation canceled');
    }

    xhr.onerror = function () {
      reject(xhr.status + " : " + xhr.statusText);
    }

    xhr.onload = function () {
      resolve(xhr.response);
    }

    xhr.send();
  });
}

fetch('https://developer.mozilla.org')
  .then(function (result) {
    document.documentElement.innerHTML = result;
  })
  .catch(function (err) {
    console.log(err)
  })
  .progress(function (percent) {
    console.log('Loading: ' + percent.toFixed(1) + '%')
  });
```

Yes, that's all! Feel free to make that fetch function smarter by adding a second parameter providing an HTTP headers configuration object.
