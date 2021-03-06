'use strict';


var Util = require('./Util');


var _CALLBACK_SEQUENCE = 0;

// defaults for jsonp method
var _DEFAULT_JSONP_OPTIONS = {
  url: null,
  success: null,
  error: null,
  data: null,
  callbackName: null,
  callbackParameter: 'callback'
};

// defaults for ajax method
var _DEFAULT_AJAX_OPTIONS = {
  url: null,
  success: null,
  error: null,
  method: 'GET',
  headers: null,
  data: null,
  rawdata: null
};

// API Method Declarations

var ajax,
    getCallbackName,
    jsonp,
    restrictOrigin,
    urlEncode;


// API Method Definitions

/**
 * Make an AJAX request.
 *
 * @param options.url {String}
 *      the url to request.
 * @param options.success {Function}
 *      called with data loaded by script
 * @param options.error {Function} optional
 *      called when script fails to load
 * @param options.method {String}
 *      request method, default is 'GET'
 * @param options.headers {Object}
 *      request header name as key, value as value.
 * @param options.data {Object}
 *      request data, sent using content type
 *      'application/x-www-form-urlencoded'.
 * @param options.rawdata {?}
 *      passed directly to send method, when options.data is null.
 *      Content-type header must also be specified. Default is null.
 */
ajax = function (options) {
  var h,
      postdata,
      queryString,
      url,
      xhr;

  options = Util.extend({}, _DEFAULT_AJAX_OPTIONS, options);
  url = options.url;

  if (options.restrictOrigin) {
    url = restrictOrigin(url);
  }
  postdata = options.rawdata;

  if (options.data !== null) {
    queryString = urlEncode(options.data);
    if (options.method === 'GET') {
      // append to url
      url = url + '?' + queryString;
    } else {
      // otherwise send as request body
      postdata = queryString;
      if (options.headers === null) {
        options.headers = {};
      }
      // set request content type
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }

  xhr = new XMLHttpRequest();

  // setup callback
  xhr.onreadystatechange = function () {
    var data, contentType;

    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        if (options.success !== null) {
          data = xhr.response;
          contentType = xhr.getResponseHeader('Content-Type');
          if (contentType && contentType.indexOf('json') !== -1) {
            data = JSON.parse(data);
          }
          options.success(data, xhr);
        }
      } else {
        if (options.error !== null) {
          options.error(xhr.status, xhr);
        }
      }
    }
  };

  // open request
  xhr.open(options.method, url, true);

  // send headers
  if (options.headers !== null) {
    for (h in options.headers) {
      xhr.setRequestHeader(h, options.headers[h]);
    }
  }

  // send data
  xhr.send(postdata);
};

/**
 * Generate a unique callback name.
 *
 * @return a unique callback name.
 */
getCallbackName = function () {
  return '_xhr_callback_' + new Date().getTime() +
      '_' + (++_CALLBACK_SEQUENCE);
};

/**
 * Make a JSONP request.
 *
 * @param options.url {String}
 *      url to load
 * @param options.success {Function}
 *      called with data loaded by script
 * @param options.error {Function} optional
 *      called when script fails to load
 * @param options.data {Object} optional
 *      request parameters to add to url
 *
 * @param options.callbackName {String} optional
 * @param options.callbackParameter {String} optional
 *      default is 'callback'
 */
jsonp = function (options) {
  var data,
      callback,
      onLoad,
      onError,
      script,
      url;

  options = Util.extend({}, _DEFAULT_JSONP_OPTIONS, options);
  url = options.url;
  data = Util.extend({}, options.data);
  callback = options.callbackName || getCallbackName();

  // add data and callback to url
  data[options.callbackParameter] = callback;
  url += (url.indexOf('?') === -1 ? '?' : '&') + urlEncode(data);

  // create script element for jsonp request
  script = document.createElement('script');
  script.src = url;
  script.async = true;

  // setup global callback called by script
  window[callback] = function () {
    options.success.apply(null, arguments);
  };

  // called after successful load, or by error handler
  onLoad = function () {
    // remove event handlers
    script.removeEventListener('load', onLoad);
    script.removeEventListener('error', onError);
    onLoad = null;
    onError = null;
    // remove script element
    script.parentNode.removeChild(script);
    script = null;
    // remove global callback
    window[callback] = null;
    delete window[callback];
  };

  // called after error loading script
  onError = function () {
    onLoad();
    // call error callback
    if (options.error !== null) {
      options.error.apply(null, arguments);
    }
  };

  // attach script event handlers
  script.addEventListener('load', onLoad);
  script.addEventListener('error', onError);

  // add script to start request
  document.getElementsByTagName('script')[0].parentNode.appendChild(script);
};

restrictOrigin = function (url) {
  var a,
      restrictedUrl;

  a = document.createElement('a'); // Hack to parse only the pathname
  a.setAttribute('href', url);
  restrictedUrl = a.pathname;

  // Needed for IE, which omits leading slash.
  if ((url.indexOf('http') === 0 || url.indexOf('/') === 0) &&
      restrictedUrl.indexOf('/') !== 0) {
    restrictedUrl = '/' + restrictedUrl;
  }

  return restrictedUrl;
};

/**
 * URL encode an object.
 *
 * @param obj {Object}
 *      object to encode
 *
 * @return {String}
 *      url encoded object
 */
urlEncode = function (obj) {
  var data, key, encodedKey, value, i, len;

  data = [];
  for (key in obj) {
    encodedKey = encodeURIComponent(key);
    value = obj[key];

    if (value instanceof Array) {
      // Add each value in array seperately
      for (i = 0, len = value.length; i < len; i++) {
        data.push(encodedKey + '=' + encodeURIComponent(value[i]));
      }
    } else {
      data.push(encodedKey + '=' + encodeURIComponent(value));
    }
  }
  return data.join('&');
};


// expose the API
module.exports = {
  ajax: ajax,
  getCallbackName: getCallbackName,
  jsonp: jsonp,
  restrictOrigin: restrictOrigin,
  urlEncode: urlEncode,
};