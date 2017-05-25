/* */ 
"format cjs";
(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(require('../../lib/codemirror'));
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror"], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var listRE = /^(\s*)(>[> ]*|- \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/,
      emptyListRE = /^(\s*)(>[> ]*|- \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/,
      unorderedListRE = /[*+-]\s/;
  CodeMirror.commands.newlineAndIndentContinueMarkdownList = function(cm) {
    if (cm.getOption("disableInput"))
      return CodeMirror.Pass;
    var ranges = cm.listSelections(),
        replacements = [];
    for (var i = 0; i < ranges.length; i++) {
      var pos = ranges[i].head;
      var eolState = cm.getStateAfter(pos.line);
      var inList = eolState.list !== false;
      var inQuote = eolState.quote !== 0;
      var line = cm.getLine(pos.line),
          match = listRE.exec(line);
      if (!ranges[i].empty() || (!inList && !inQuote) || !match) {
        cm.execCommand("newlineAndIndent");
        return;
      }
      if (emptyListRE.test(line)) {
        cm.replaceRange("", {
          line: pos.line,
          ch: 0
        }, {
          line: pos.line,
          ch: pos.ch + 1
        });
        replacements[i] = "\n";
      } else {
        var indent = match[1],
            after = match[5];
        var bullet = unorderedListRE.test(match[2]) || match[2].indexOf(">") >= 0 ? match[2].replace("x", " ") : (parseInt(match[3], 10) + 1) + match[4];
        replacements[i] = "\n" + indent + bullet + after;
      }
    }
    cm.replaceSelections(replacements);
  };
});
