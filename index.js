"use strict";

var nodeURL = require('url');
var querystring = require('querystring');
var _ = require('lodash');
var util = require('kinda-util').create();
var httpClient = require('kinda-http-client').create();
var KindaDBCommon = require('kinda-db-common');
var Auth = require('kinda-db-auth');

var KindaRESTDB = KindaDBCommon.extend('KindaRESTDB', function() {
  this.include(Auth);

  this.Table = require('./table');

  this.setCreator(function(name, url, options) {
    if (!name) throw new Error('name is missing');
    if (!url) throw new Error('url is missing');
    this.name = name;
    if (util.endsWith(url, '/'))
      url = url.substr(0, url.length - 1);
    this.baseURL = url;
    this.database = this;
    this.tables = [];
  });

  // TODO: emit 'token.didExpire' in case of token expiration

  this.get = function *(table, key, options) {
    table = this.normalizeTable(table);
    key = this.normalizeKey(key);
    options = this.normalizeOptions(options);
    var url = this.makeURL(table, key, undefined, options);
    var params = { method: 'GET', url: url };
    var res = yield httpClient.request(params);
    if (res.statusCode === 204) return;
    else if (res.statusCode !== 200) throw this.createError(res);
    return res.body;
  };

  this.put = function *(table, key, item, options) {
    table = this.normalizeTable(table);
    if (key != null) key = this.normalizeKey(key);
    item = this.normalizeItem(item);
    options = this.normalizeOptions(options);
    var url = this.makeURL(table, key, undefined, options);
    var params = { method: key ? 'PUT' : 'POST', url: url, body: item };
    var res = yield httpClient.request(params);
    if (res.statusCode !== (key ? 200 : 201)) throw this.createError(res);
    return res.body;
  };

  this.del = function *(table, key, options) {
    table = this.normalizeTable(table);
    key = this.normalizeKey(key);
    options = this.normalizeOptions(options);
    var url = this.makeURL(table, key, undefined, options);
    var params = {
      method: 'DELETE',
      url: url,
      json: false // Avoid a bug in browser-request
    };
    var res = yield httpClient.request(params);
    if (res.statusCode !== 204) throw this.createError(res);
  };

  this.getRange = function *(table, options) {
    table = this.normalizeTable(table);
    options = this.normalizeOptions(options);
    var url = this.makeURL(table, undefined, undefined, options);
    var params = { method: 'GET', url: url };
    var res = yield httpClient.request(params);
    if (res.statusCode !== 200) throw this.createError(res);
    return res.body;
  };

  this.getCount = function *(table, options) {
    table = this.normalizeTable(table);
    options = this.normalizeOptions(options);
    var url = this.makeURL(table, 'count', undefined, options);
    var params = { method: 'GET', url: url };
    var res = yield httpClient.request(params);
    if (res.statusCode !== 200) throw this.createError(res);
    return res.body;
  };

  this.call = function *(table, key, action, params, options) {
    table = this.normalizeTable(table);
    key = this.normalizeKey(key);
    options = this.normalizeOptions(options);
    var url = this.makeURL(table, key, action, options);
    var params = { method: 'POST', url: url, body: params };
    var res = yield httpClient.request(params);
    if (res.statusCode !== 201) throw this.createError(res);
    return res.body;
  };

  this.makeURL = function(table, key, action, query, options) {
    table = this.normalizeTable(table);
    if (!options) options = {};
    if (!options.hasOwnProperty('includeToken'))
      options.includeToken = true;
    var url = this.baseURL;
    url += '/' + util.dasherize(table.name);
    if (key != null) url += '/' + this.urlify(key);
    if (action) url += '/' + action;
    if (this.token && options.includeToken)
      query.token = this.token;
    query = util.encodeObject(query);
    query = querystring.stringify(query);
    if (query)
      url += '?' + query;
    return url;
  };

  this.parseURL = function(table, url) { // extract item key from an URL
    table = this.normalizeTable(table);
    if (!url) throw new Error('url is missing');
    url = nodeURL.parse(url);
    var index = url.pathname.lastIndexOf('/');
    if (index === -1) throw new Error('invalid url');
    var key = url.pathname.substr(index + 1);
    return key;
  };

  this.createError = function(res) {
    var msg = 'HTTP error: ';
    msg += res.body.error ? res.body.error : 'unknown';
    msg += ' (statusCode=' + res.statusCode + ')';
    var error = new Error(msg);
    error.statusCode = res.statusCode;
    return error;
  };

  this.urlify = function(val) {
    if (_.isNumber(val))
      return 'num!' + val;
    else if (_.isString(val))
      return val;
    else
      throw new Error('unsupported type');
  };
});

module.exports = KindaRESTDB;
