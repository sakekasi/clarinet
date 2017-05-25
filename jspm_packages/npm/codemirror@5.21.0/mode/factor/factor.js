/* */ 
"format cjs";
(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(require('../../lib/codemirror'), require('../../addon/mode/simple'));
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror", "../../addon/mode/simple"], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  CodeMirror.defineSimpleMode("factor", {
    start: [{
      regex: /#?!.*/,
      token: "comment"
    }, {
      regex: /"""/,
      token: "string",
      next: "string3"
    }, {
      regex: /"/,
      token: "string",
      next: "string"
    }, {
      regex: /(?:[+-]?)(?:0x[\d,a-f]+)|(?:0o[0-7]+)|(?:0b[0,1]+)|(?:\d+.?\d*)/,
      token: "number"
    }, {
      regex: /(\:)(\s+)(\S+)(\s+)(\()/,
      token: ["keyword", null, "def", null, "keyword"],
      next: "stack"
    }, {
      regex: /USING\:/,
      token: "keyword",
      next: "vocabulary"
    }, {
      regex: /(USE\:|IN\:)(\s+)(\S+)/,
      token: ["keyword", null, "variable-2"]
    }, {
      regex: /<\S+>/,
      token: "builtin"
    }, {
      regex: /;|t|f|if|\.|\[|\]|\{|\}|MAIN:/,
      token: "keyword"
    }, {
      regex: /\S+/,
      token: "variable"
    }, {
      regex: /./,
      token: null
    }],
    vocabulary: [{
      regex: /;/,
      token: "keyword",
      next: "start"
    }, {
      regex: /\S+/,
      token: "variable-2"
    }, {
      regex: /./,
      token: null
    }],
    string: [{
      regex: /(?:[^\\]|\\.)*?"/,
      token: "string",
      next: "start"
    }, {
      regex: /.*/,
      token: "string"
    }],
    string3: [{
      regex: /(?:[^\\]|\\.)*?"""/,
      token: "string",
      next: "start"
    }, {
      regex: /.*/,
      token: "string"
    }],
    stack: [{
      regex: /\)/,
      token: "meta",
      next: "start"
    }, {
      regex: /--/,
      token: "meta"
    }, {
      regex: /\S+/,
      token: "variable-3"
    }, {
      regex: /./,
      token: null
    }],
    meta: {
      dontIndentStates: ["start", "vocabulary", "string", "string3", "stack"],
      lineComment: ["!", "#!"]
    }
  });
  CodeMirror.defineMIME("text/x-factor", "factor");
});