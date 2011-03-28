/*
---
 
script: Resource.js
 
description: Base class that defines remote resource
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

credits:
  Influenced by Jester javascript library

requires:
  - Core/Options
  - Core/Events
  - Core/Chain
  - String.Inflections/String.camelize

provides:
  - Resource
 
...
*/


Resource = new Class({
  Implements: [Options, Events, Chain],

  options: {
    format: 'json',
    urls: {
      'list': '/:plural',
      'show': '/:plural/:id',
      'destroy': '/:plural/:id',
      'new': '/:plural/new'
    },
    request: {
      secure: false
    },
    associations: {}, //{users: ['Person', options]}
    prefix: '', //If prefix is 'true' it respects parent association's path
    custom: {}, //Name => method hash or an array of PUT methods
    postprocess: function(data) {
      if (typeOf(data) != 'array' || data.some(function(e) { return e.length != 2})) return data
      return {
        errors: data.map(function(i) { return i.join(' ')})
      }
    }
  },
  
  associations: {},

  initialize: function(name, options) {
    
    this.name = name;
    Object.append(this.options, {
      singular: name.tableize().singularize(),
      plural: name.tableize().pluralize(),
      name: name
    });
    
    this.setOptions(options)
    Object.append(this.options, {
      singular_xml: this.options.singular.replace(/_/g, '-'),
      plural_xml: this.options.plural.replace(/_/g, '-')
    })
    
    this.klass = new Class({
      Extends: Resource.Model
    })
    Object.append(this.klass, this)
    this.klass.implement({resource: this})
    this.klass.implement(this.setAssociations(this.options.associations))
    this.klass.implement(this.setCustomActions(this.options.custom))
    return this.klass
  },
  
  setAssociations: function(associations) {
    if (!associations) return
    
    var obj = {}
    Object.each(associations, function(association, name) {      
      var singular = name.singularize().camelCase().capitalize()
      this['get' + singular] = function(data) {
        return new (this.resource.associations[name])(data, true)
      }
      var reflection = association[0]      
      var options = Object.append({prefix: true}, association[1] || {})      
      options.prefix_given = options.prefix
      
      
      if (options.prefix == true) {
        options.prefix = this.locate.bind(this)        
      } else if (options.prefix == false) {
        options.prefix = this.options.prefix
      }
      var assoc = this.associations[name] = new Resource(reflection, options)
      var klsfd = name.camelCase().pluralize().capitalize()
      var singular = klsfd.singularize()
      obj['get' + singular] = function() {
        if (!this[name]) return;
        return this[name]
      }
      obj['get' + klsfd] = function() {
        return assoc.claim(this)
      }
      obj['get' + klsfd + 'Association'] = function() {
        return assoc.claim(this)
      }
      obj['set' + singular] = function(value, existant) {
        return this[name] = new assoc(value, existant, this)
      }
      obj['set' + klsfd] = function(value, existant) {
        return this[name] = value.map(function(el) {
          return new assoc(el, existant, this)
        }.bind(this))
      }
      obj['new' + singular] = function(data) {
        return new assoc(data, false, this)
      }
      obj['init' + singular] = function(data) {
        return new assoc(data, true, this)
      }
    }, this)
    return obj
  },
  
  setCustomActions: function(actions) {
    if (!actions) return;
    var methods = {};
    
    if (typeOf(actions) == 'array') { //We assume that array of custom methods is all of PUTs
      var arr = actions.push ? actions : [actions];
      actions = {};
      for (var i = 0, j = arr.length; i < j; i++) actions[arr[i]] = 'put';
    }
    
    Object.each(actions, function(value, key) {
      methods[key] = Resource.Model.createCustomAction.call(this, key, value);
    }, this);
    
    return methods;
  },

  getRequest: function() {
    return new Request[this.options.format.toUpperCase()](this.options.request)
  },
  
  create: function(a, b) { //Ruby-style Model#create backward compat
    return new (this.klass || this)(a, b)
  },
  
  init: function(a) {
    return this.create(a, true)
  },
  
  claim: function(thing) {
    this.options.prefix = thing.prefix || (this.options.prefix && this.options.prefix.call ? this.options.prefix(thing) : this.options.prefix)
    return this
  },
  
  request: function(options, callback, model) {
    if (options.route) options.url = this.getFormattedURL(options.route, options);
    if (options.data && options.data.call) options.data = options.data.call(model)
    
    var req = this.getRequest();
    ['success', 'failure', 'request', 'complete'].each(function(e) {
      var cc = 'on' + e.capitalize()
      req.addEvent(e, function(data) {
        data = this[this[cc] ? cc : "handle"].apply(this, arguments);
        if (e == 'success') {
          if (callback) {
            switch (typeOf(callback)) {
              case "string":
                this.fireEvent(callback, data);
                break;
              case "function":
                if (typeOf(data) == "array") {
                  callback.apply(window, data)
                } else {
                  callback(data);
                }
            }
          }
        }

        if (options[cc]) options[cc](data);
        if (e == 'success') this.callChain(data);
        model.fireEvent(e, data);
      }.bind(this));
      return req;
    }, this)
    req.send(options)
    
    return req;
  },

  onFailure: function(response) {
    return this.getParser('json').parse(JSON.decode(response))
  },
  
  handle: function() {
    var parser = this.getParser();
    var data = this.options.postprocess(parser.parse.apply(parser, arguments));
    switch(typeOf(data)) {
      case "array":
        return data.map(this.init.bind(this));
      case "string":
        return data;
      case "object": case "hash":
        return this.init(data);
    }
  },
  
  find: function(id, params, callback) {
    if (!callback && typeOf(params) != 'object') {
      callback = params;
      params = null;
    }
    switch (id) {
      case 'first': return this.find('all', callback)
      case 'all': return this.request({method: 'get', route: 'list', data: params}, callback);
      default: return this.request({method: 'get', route: 'show', data: params, id: id}, callback);
    }
  },
  
  getParser: function(format) {
    var parser = Resource.Parser[(format || this.options.format).toUpperCase()];
    if (!parser.instance) parser.instance = new parser;
    return parser.instance;
  },
  
  getURL: function(route, thing) {
    var prefix = thing.prefix || (this.options.prefix && this.options.prefix.call ? this.options.prefix(thing) : this.options.prefix);
    var route = (this.options.urls[route] || route);
    if (route.charAt(0) == '/' && prefix.charAt(prefix.length - 1) == '/') prefix = prefix.substring(0, prefix.length - 1);
    return Resource.interpolate(prefix + route, thing, this.options)
  },
  
  locate: function(thing) {
    return this.getURL('show', thing)
  },
   
  getFormattedURL: function(route, thing) {
    return this.format(this.getURL(route, thing))
  },
  
  format: function(string) {
    return string.replace(/(?=\?)|\/?$/, '.' + this.options.format)
  }
});

!function() {
  
  var fill = function (what, thing, opts) {
    switch(what) {
      case 'format':
        return '.' + opts.format
      case 'singular': 
      case 'plural': 
        return opts[what]
      default:
        if (!thing) return (opts) ? opts[what] : null
        if (thing.resource) return thing.get(what.replace(/::/g, '.')) 
        return (typeof(thing[what]) == 'function' ? thing[what]() : thing[what])
    }
  }
  
  var interpolation = function(thing, opts) {
    return function(m, what) {
      return fill(what, thing, opts)
    }
  }
  var regex = /:((?:[a-zA-Z0-9]|::)+)/g;
  Resource.interpolate = function(str, thing, opts) {
    return str.replace(regex, interpolation(thing, opts))
  }
  
}();