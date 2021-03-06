'use strict';

var Events = require('../util/Events'),
    Util = require('../util/Util');

/**
 * Constructor
 *
 * @param data {Object}
 *      key/value attributes of this model.
 */
var Model = function (data) {
  var _this,
      _initialize,

      _model;


  _this = Object.create(Events());

  _initialize = function () {
    _model = Util.extend({}, data);

    // track id at top level
    if (data && data.hasOwnProperty('id')) {
      _this.id = data.id;
    }

    data = null;
  };

  _this.destroy = function () {
    _this.off();
  };

  /**
   * Get one or more values.
   *
   * @param key {String}
   *      the value to get; when key is undefined, returns the object with all
   *      values.
   * @return
   *      - if key is specified, the value or null if no value exists.
   *      - when key is not specified, the underlying object is returned.
   *        (Any changes to this underlying object will not trigger events!!!)
   */
  _this.get = function (key) {
    if (typeof(key) === 'undefined') {
      return _model;
    }

    if (_model.hasOwnProperty(key)) {
      return _model[key];
    }

    return null;
  };

  /**
   * Update one or more values.
   *
   * @param data {Object}
   *      the keys and values to update.
   * @param options {Object}
   *      options for this method.
   * @param options.silent {Boolean}
   *      default false. true to suppress any events that would otherwise be
   *      triggered.
   */
  _this.set = function (data, options) {
    // detect changes
    var changed = {},
      anyChanged = false,
      c;

    for (c in data) {
      if (!_model.hasOwnProperty(c) || _model[c] !== data[c]) {
        changed[c] = data[c];
        anyChanged = true;
      }
    }

    // persist changes
    _model = Util.extend(_model, data);

    // if id is changing, update the model id
    if (data && data.hasOwnProperty('id')) {
      _this.id = data.id;
    }

    if (options && options.hasOwnProperty('silent') && options.silent) {
      // don't trigger any events
      return;
    }

    // trigger events based on changes
    if (anyChanged ||
        (options && options.hasOwnProperty('force') && options.force)) {
      for (c in changed) {
        // events specific to a property
        _this.trigger('change:' + c, changed[c]);
      }
      // generic event for any change
      _this.trigger('change', changed);
    }
  };

  /**
   * Override toJSON method to serialize only model data.
   */
  _this.toJSON = function () {
    var json = Util.extend({}, _model),
        key,
        value;

    for (key in json) {
      value = json[key];

      if (typeof value === 'object' &&
          value !== null &&
          typeof value.toJSON === 'function') {
        json[key] = value.toJSON();
      }
    }

    return json;
  };


  _initialize();
  return _this;
};

module.exports = Model;