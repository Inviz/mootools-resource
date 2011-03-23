/*
---
 
script: Resource.Collection.js
 
description: Extended collection of models array (just like Elements in mootools)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - Resource
  
provides:
  - Resource.Collection
 
...
*/

Resource.Collection = function(models) {
  return Object.append(models, this)
};

Resource.Collection.prototype = {
  createAction: function(name) {
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      if (args.getLast()) var callback = args.pop();
      this.each(function(model) {
        model[a](args)
      });
      if (callback) callback.call(this)
    }
  }
};

Object.each(Resource.Model.Actions, function(action, name) {
  Resource.Collection.prototype[name] = Resource.Collection.createAction(action);
});