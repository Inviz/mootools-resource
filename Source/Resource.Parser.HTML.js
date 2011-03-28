/*
---
 
script: Resource.Parser.HTML.js
 
description: Handles HTML responses from actions
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
  
requires:
  - Resource.Parser
  
provides:
  - Resource.Parser.HTML

...
*/


Resource.Parser.HTML = new Class({
  Extends: Resource.Parser,
  
  parse: function(c, c, html) {
    return html;
  }
});