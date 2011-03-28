/*
---
 
script: Resource.Parser.JSON.js
 
description: Applies json as model properties and does type casting
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Parser
  
provides:
  - Resource.Parser.JSON
 
...
*/

Resource.Parser.JSON = new Class({
  Extends: Resource.Parser,
  
  parse: function(value, key) {
    if (!key && !value) return []
    var type = typeOf(value)
    if (type == 'object') return this.object(value)
    if (key) {
      //if (key == 'id' || key.substr(-3, 3) == '_id') return this.integer(value, key)
      if (key.substr(-3, 3) == '_at') return this.datetime(value, key)
    }
    if (type == 'array') return this.array(value, key)
    return value
  }
});