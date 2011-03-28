/*
---
 
script: Resource.Parser.XML.js
 
description: Convert xml response based on @type attributes
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Parser
  
provides:
  - Resource.Parser.XML
 
...
*/

Resource.Parser.XML = new Class({
  Extends: Resource.Parser,
  
  parse: function(data) {
    obj = {}
    Object.each(data, function(key, value) {
      obj[key] = this[value['@type']] ? this[value['@type']](value['#text']) : value['#text']
    }, this)
    return obj
  }
});