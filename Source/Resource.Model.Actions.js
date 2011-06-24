/*
---
 
script: Resource.Model.Actions.js
 
description: Set of methods to metaprogrammatically generate action set for resource
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Model
  
provides:
  - Resource.Model.Actions
 
...
*/


Resource.Model.Actions = {
  save: function() {
    if (!this._new_record) return Resource.Model.Actions.update.call(this)
    return {method: 'post', route: 'list', attributes: true, onComplete: this.set.bind(this), onFailure: this.onFailure.bind(this)}
  },
  
  destroy: function() {
    return {method: 'delete', route: 'destroy'}
  },
  
  update: function() {
    return {method: 'put', attributes: true, route: 'show'}
  },
  
  reload: function() {
    if (!this.id) return this;
    return {method: 'get', route: 'show'}
  },
  
  'new': function() {
    return {method: 'get', route: 'new', attributes: true}
  }
};


Resource.Model.extend({
  createAction: function(name, options) {
    if (!options) options = {};
    if (!options.action) options.action = Resource.Model.Actions[name];
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      if (typeof args[args.length - 1] == 'function') var callback = args.pop();
      Object.append(options, options.action.apply(this, args));
      if (options.arguments !== false) {
        for (var i = 0, arg, j = args.length; i < j; i++) {
          if ((arg = args[i])) {
            if (arg.parseQueryString) {
              if (!options.data) options.data = {};
              Object.append(options.data, arg.parseQueryString())
            } else {
              this.set(arg);
            }
          }
        }
      }
      this.fireEvent('before' + name.capitalize());
      var req = this.request(options, callback);
      return req.chain(function(data) {
        this.fireEvent('after' + name.capitalize(), data);
        return req.callChain(data);
      }.bind(this));
      
      return this;
    }
  },
  
  createCustomAction: function(name, method, obj) {
    if (method.method) {
      obj = method;
      method = obj.method;
    }
    if (!this.options.urls[name]) this.options.urls[name] = '/:plural/:id/' + name
    return Resource.Model.createAction(name, Object.append({
      action: function () {
        var options = {}
        if (method == 'put') options.onComplete = this.set.bind(this);
        return options;
      },
      route: name, 
      method: method
    }, obj));
  }
});

Object.each(Resource.Model.Actions, function(action, name) {
  Resource.Model.prototype[name] = Resource.Model.createAction(name);
});