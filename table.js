"use strict";

var _ = require('lodash');
var KindaObject = require('kinda-object');
var util = require('kinda-util').create();

var Table = KindaObject.extend('Table', function() {
  this.setCreator(function(name, database) {
    if (!name) throw new Error('name is missing');
    this.name = name;
    this.database = database;
  });

  this.normalizeIndex = function(indexOrKeys) {
    if (_.isString(indexOrKeys))
      return { keys: [indexOrKeys] };
    else if (_.isArray(indexOrKeys))
      return { keys: indexOrKeys };
    else
      throw new Error('invalid index');
  }
});

module.exports = Table;
