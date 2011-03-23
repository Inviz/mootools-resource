/*
---
 
script: Resource.Parser.js
 
description: A base class to convert any object to model properties
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource
  
provides:
  - Resource.Parser
 
...
*/


Resource.Parser = new Class({
  
  integer: function(value) {
    var parsed = parseInt(value);
    return (isNaN(parsed)) ? value : parsed
  },
  
  datetime: function(value) {
    return new Date(Date.parse(value))
  },
  
  'boolean': function(value) {
    return value == 'true'
  },

  array: function(children) {
    return children.map(function(c) { return this.parse(c) }.bind(this))
  }, 
  
  object: function(value) {
    var obj = {}
    Object.each(value, function(val, key) {
      obj[key] = this.parse(val, key)
    }, this)
    return obj
  }
});

Resource.prototype.options.parsers = Resource.Parser;
