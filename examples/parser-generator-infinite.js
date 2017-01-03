// show error messages
calls
	.query(call => call.hasOwnProperty('throws'))
	.info(call => call.throws.message)
	.selectAll('text')
		.style('fill', 'red');

calls.query(call => call.fnName === 'GrammarParse')
	.forEach(call => console.log(call))
	.info(call => JSON.stringify(call.args[0]));

calls.query(call => call.fnName === 'GrammarParseRule')
	.info(call => call.tags.bodyType);

calls.query(call => call.fnName === 'GrammarAddRule')
	.info(call => call.args[0]);

calls.query(call => 'undefinedThis' in call.tags)
	.nextSwatch()


var astConstructors = ['nonTerminal', 'terminal', 'seq', 'choice', 'range'];
calls.query(call => astConstructors.includes(call.fnName))
	.collapse()
	.select('line')
		.style('stroke', swatches(2));

// -----------------------------------------

/*
nonterminal -> call appropriate nonterminal fn
terminal -> consume the given string
range -> consume a character and check if it's in the range
seq -> consume elements in turn
alt -> try to consume 1st. if error, reset; consume next and so on
*/

function ConsumeError(message) { this.message = message; }

function InputStream(string) {
  this.data = string;
  this.position = 0;
}

InputStream.prototype.consumeChar = function InputStreamConsumeChar(char) {
  if (this.finished()) { throw new ConsumeError('cant consume finished stream'); }
  
  var nextChar;
  while ((nextChar = this.data.charAt(this.position++)) === ' ') {
    if (this.finished()) { throw new ConsumeError('cant consume finished stream'); }
  }
  TAG('nextChar', nextChar);
  if (nextChar !== char) {
    throw new ConsumeError('cant consume');
  }
  return nextChar;
};

InputStream.prototype.consume = function InputStreamConsume() {
  if (this.finished()) { throw new ConsumeError('cant consume finished stream'); }
  
  var nextChar;
  while ((nextChar = this.data.charAt(this.position++)) === ' ') {
    if (this.finished()) { throw new ConsumeError('cant consume finished stream'); }
  }
  TAG('nextChar', nextChar);
  
  return nextChar;
};

InputStream.prototype.finished = function InputStreamFinished() {
  TAG('position', this.position);
  TAG('dataLength', this.data.length);
  return this.position >= this.data.length;
}

// --------------------------

function ParseError(message) { this.message = message; }

function Grammar() {
  this.rules = {};
}

Grammar.prototype.addRule = function GrammarAddRule(nonterminalName, value) {
  this.rules[nonterminalName] = value;
};

Grammar.prototype.parse = function GrammarParse(input, startRule) {
  var stream = new InputStream(input);
  return this.parseRule(stream, startRule);
};

Grammar.prototype.parseRule = function GrammarParseRule(stream, ruleName) {
  if (!ruleName in this.rules) {
    throw new ParseError(ruleName + ' isnt in the grammar');
  }
  
  var ruleBody = this.rules[ruleName];
  TAG('bodyType', ruleBody.type);
  return Object.assign({}, {
    ruleName: ruleName,
	children: Grammar.parseNode[ruleBody.type].call(this, stream, ruleBody)
  });
};

// returns an array of children
Grammar.parseNode = {
  nonterminal: function GrammarParseNonTerminal(stream, nonterminal) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    return [this.parseRule(stream, nonterminal.name)];
  },
  
  terminal: function GrammarParseTerminal(stream, terminal) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    var characters = terminal.value.split('');
    characters.forEach(function(char) { stream.consumeChar(char); });
    return [Object.assign({}, terminal)];
  },
  
  choice: function GrammarParseChoice(stream, choice) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    var oldPosition = stream.position;
    for (var i = 0; i < choice.options.length; i++) {
      var option = choice.options[i];
      if (i !== choice.options.length - 1) {
        try {
          return Grammar.parseNode[option.type].call(this, stream, option);
        } catch(e) {
          console.log(e.toString());
          stream.position = oldPosition;
        }
      } else {
        return Grammar.parseNode[option.type].call(this, stream, option);
      }
    }
    throw new ParseError('reached the end of a choice node');
  },
  
  seq: function GrammarParseSeq(stream, seq) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    var that = this;
    return seq.factors
      .map(function(factor) {
        return Grammar.parseNode[factor.type].call(that, stream, factor);
      })
      .reduce(function(agg, b) { return agg.concat(b); }, []);
  },
  
  range: function GrammarParseRange(stream, range) {
    
  }
}

// -------------------------------

function nonTerminal(name) {
  return {
    type: 'nonterminal',
    name: name
  };
}

function terminal(value) {
  return {
    type: 'terminal',
    value: value
  };
}

function choice() {
  var options = Array.prototype.slice.call(arguments);
  return {
    type: 'choice',
    options: options
  };
}

function seq() {
  var factors = Array.prototype.slice.call(arguments);
  return {
    type: 'seq',
    factors: factors
  };
}

function range(start, end) {
  return {
    type: 'range',
    start: start,
    end: end
  };
}

// --------------------------

function TOPLEVEL() {
  /*
  Arithmetic {
      Exp = AddExp
      AddExp = AddExp "+" MulExp
             | AddExp "-" MulExp
             | MulExp
      MulExp = MulExp "*" PriExp
             | MulExp "/" PriExp
             | PriExp
      PriExp = "(" Exp ")"
             | number
      number = 0..9
  }
  */
  var Arithmetic = new Grammar();
  Arithmetic.addRule('Exp', nonTerminal('AddExp'));
  Arithmetic.addRule('AddExp', choice(
    seq(nonTerminal('AddExp'), terminal('+'), nonTerminal('MulExp')),
    nonTerminal('MulExp')
  ));
  Arithmetic.addRule('MulExp', nonTerminal('number'));
  Arithmetic.addRule('number', range('0', '9'));
  
  console.log(JSON.stringify(Arithmetic.parse('1 + 2', 'Exp')));
  console.log(JSON.stringify(Arithmetic.parse('1 +', 'Exp')));
}

TOPLEVEL();