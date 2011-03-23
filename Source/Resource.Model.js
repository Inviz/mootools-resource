/*
---
 
script: Model.js
 
description: A single resource instance
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource
  
provides:
  - Resource.Model
 
...
*/

Resource.Model = new Class({
  Implements: [new Options, new Events],
  
  initialize: function(attributes, existant_record, claiming) {
    this._claiming = claiming
    this._defaults = attributes
    
    this.set(attributes);
    this._new_record = (existant_record == false) || !this.get('id');
    return this;
  },
  
  set: function(key, value) {
    if (arguments.length == 2) {
      this.setAttribute(key, value)
    } else {
      switch (typeOf(key)) {
        case 'element':
           //try to get attribute resource_id
           //else assume that id is formatted like resource_123.
          var id = Resource.Model.id(key, this.getPrefix());
          if (id) {
            this.set('id', id);
            this._new_record = false;
          } 
           break
        case 'object': case 'array':
          var complex = []
          for (var k in key) {
            if (['array', 'object'].contains(typeOf(key[k]))) {
              complex.push(k)
            } else {  
              this.setAttribute(k, key[k])
            }
          }
      }
      
      
      if (this._claiming) {
        this.claim(this._claiming)
        delete this._claiming
      }
      
      if (complex && complex.length) complex.each(function(k) {
        this.setAttribute(k, key[k])
      }, this)
    }
    
    return this
  },
  
  get: function(name) {
    var bits = name.split('.')
    var obj = this
    bits.each(function(bit) {
      if (obj == null || !obj.getAttribute) return obj = null
      obj = obj.getAttribute(bit)
    })
    return obj
  },
  
  setAttribute: function(name, value) {
    if (this['set' + name.camelize()]) value = this['set' + name.camelize()](value)
    this[name] = value
  },  
  
  getAttribute: function(name) {
    if (this['get' + name.camelize()]) return this['get' + name.camelize()]()
    return this[name]
  },
  
  getAssociated: function(name) {
    return this.resource.associations[name]
  },
  
  request: function(options, callback) {
    return this.resource.request(Object.append(this.getClean(), options), callback, this)
  },
  
  getClean: function(){
    //Here we overcome JS's inability to have crossbrowser getters & setters
    //I wouldnt use these pseudoprivate _underscore properties otherwise
    var clean = {};
    for (var key in this){
      if (
        key != 'prototype' && 
        key != 'resource' &&
        key.match(/^[^_$A-Z]/) && //doesnt start with _, $ or capital letter
        typeof(this[key]) != 'function'
      ) clean[key] = this[key];
    }
    return clean;
  },
  
  getAttributes: function() {
    return this.getClean();
  },
  
  isNew: function() {
    return this._new_record
  },
  
  isDirty: function() {
    return this._defaults == this.getClean();
  },
  
  onFailure: function() {
    console.error('Achtung', arguments);
  },
  
  getPrefix: function() {
    return this.resource.options.singular
  },
  
  getData: function() {
    return this.getPrefixedClean()
  },
  
  getPrefixedClean: function() {
    var obj = {}
    var clean = this.getClean()
    delete clean.prefix
    obj[this.getPrefix()] = clean
    
    return obj
  },
  
  getURL: function(route) {
    return this.resource.getURL(route || 'show', this)
  },
  
  claim: function(what) {
    this.prefix = (this.resource.options.prefix_given) && this.resource.options.prefix.run ? this.resource.options.prefix(what) : what.prefix
    return this
  }
});


Resource.Model.id = function(element, prefix) {
  var id;
  if (prefix) id = element.get(prefix + '_id');
  if (!id && (id = element.get('id'))) {
    var regex = '(.*)$';
    if (prefix) {
      regex = '^' + prefix + '[_-]' + regex;
    } else {
      regex = '_' + regex;
    }
    id = (id.match(new RegExp(regex)) || [null, null])[1];
  }
  return id;
}