// show error messages
calls
	.query(call => call.hasOwnProperty('throws'))
	.info(call => call.throws.message || 'undefined');

calls.refresh();
calls
	.query(call => call.hasOwnProperty('throws'))
	.selectAll('text')
		.style('fill', 'red');

calls.query(call => call.fnName === 'Grammar.parse')
	.forEach(call => console.log(call))
	.info(call => JSON.stringify(call.args[0]));

calls.query(call => call.fnName === 'Grammar.parseRule')
	.info(call => call.args[1] + ' ; ' + call.tags.bodyType);

calls.query(call => call.fnName === 'Grammar.addRule')
	.info(call => call.args[0]);

calls.query(call => 'undefinedThis' in call.tags)
	.nextSwatch(1)

calls.query(call => (call.fnName === 'InputStream.consumeChar' || call.fnName === 'InputStream.consume') && !call.throws)
	.nextSwatch(3)

calls.query(call => call.fnName === 'InputStream.consumeChar')
	.info(call => call.args[0]);

calls.query(call => call.fnName === 'InputStream.consume')
	.info(call => call.tags.nextChar || 'undefined');

var astConstructors = ['nonTerminal', 'terminal', 'seq', 'choice', 'range', 'epsilon'];
calls.query(call => astConstructors.includes(call.fnName))
	.collapse()
	.select('line')
		.style('stroke', swatches(2));

var toStrings = ['ConsumeError.toString', 'ParseError.toString'];
calls.query(call => toStrings.includes(call.fnName))
	.collapse()
	.select('line')
		.style('stroke', swatches(5));

calls.query(call => call.fnName === 'console.log' && call.parent.fnName !== 'TOPLEVEL')
	.collapse()
	.select('line')
		.style('stroke', swatches(6));

calls.query(call => call.tags.backtracked)
	.nextSwatch(5);

// --------------------------

/*
nonterminal -> call appropriate nonterminal fn
terminal -> consume the given string
range -> consume a character and check if it's in the range
seq -> consume elements in turn
alt -> try to consume 1st. if error, reset; consume next and so on
*/

function ConsumeError(message) { this.message = message; }
ConsumeError.prototype.toString = function ConsumeError$toString() { return this.message; }

function InputStream(string) {
  this.data = string;
  this.position = 0;
}

InputStream.prototype.consumeChar = function InputStream$consumeChar(char) {
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

InputStream.prototype.consume = function InputStream$consume() {
  if (this.finished()) { throw new ConsumeError('cant consume finished stream'); }
  
  var nextChar;
  while ((nextChar = this.data.charAt(this.position++)) === ' ') {
    if (this.finished()) { throw new ConsumeError('cant consume finished stream'); }
  }
  TAG('nextChar', nextChar);
  
  return nextChar;
};

InputStream.prototype.finished = function InputStream$finished() {
  TAG('position', this.position);
  TAG('dataLength', this.data.length);
  return this.position >= this.data.length;
}

// --------------------------

function ParseError(message) { this.message = message; }
ParseError.prototype.toString = function ParseError$toString() { return this.message; }

function Grammar() {
  this.rules = {};
}

Grammar.prototype.addRule = function Grammar$addRule(nonterminalName, value) {
  this.rules[nonterminalName] = value;
};

Grammar.prototype.parse = function Grammar$parse(input, startRule) {
  var stream = new InputStream(input);
  var ans = this.parseRule(stream, startRule);
  if (!stream.finished()) {
    throw new ParseError('stream not fully consumed. ' + JSON.stringify(stream.data.slice(stream.position)) + 'was left over');
  }
  return ans;
};

Grammar.prototype.parseRule = function Grammar$parseRule(stream, ruleName) {
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
  nonterminal: function Grammar$parseNonTerminal(stream, nonterminal) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    return [this.parseRule(stream, nonterminal.name)];
  },
  
  terminal: function Grammar$parseTerminal(stream, terminal) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    var characters = terminal.value.split('');
    for (var i = 0; i < characters.length; i++) {
      var char = characters[i];
      stream.consumeChar(char);
    }
    return [Object.assign({}, terminal)];
  },
  
  choice: function Grammar$parseChoice(stream, choice) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    var oldPosition = stream.position;
    for (var i = 0; i < choice.options.length; i++) {
      var option = choice.options[i];
      if (i !== choice.options.length - 1) {
        try {
          return Grammar.parseNode[option.type].call(this, stream, option);
        } catch(e) {
          console.log('ERROR', e.toString());
          TAG('backtracked', true);
          stream.position = oldPosition;
        }
      } else {
        return Grammar.parseNode[option.type].call(this, stream, option);
      }
    }
    throw new ParseError('reached the end of a choice node');
  },
  
  seq: function Grammar$parseSeq(stream, seq) {
    if (this === null || this === undefined) { TAG('undefinedThis', true); }
    var ans = [];
    for (var i = 0; i < seq.factors.length; i++) {
      var factor = seq.factors[i];
      ans = ans.concat(Grammar.parseNode[factor.type].call(this, stream, factor));
    }
    return ans;
  },
  
  range: function Grammar$parseRange(stream, range) {
    var char = stream.consume();
    if (char.charCodeAt(0) >= range.start.charCodeAt(0) &&
        char.charCodeAt(0) <= range.end.charCodeAt(0)) {
      return [Object.assign({}, range, {value: char})];
    } else {
      throw new ParseError(char + ' isnt in range ' + range.start + ' .. ' + range.end);
    }
  },
  
  epsilon: function Grammar$parseEpsilon(stream, range) {
    return [{type: epsilon}];
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

function epsilon() {
  return {
    type: 'epsilon'
  };
}

// --------------------------

function TOPLEVEL() {
  /*
  Arithmetic {
      Exp = AddExp
      AddExp = MulExp AddExpCont
      AddExpCont = "+" MulExp AddExpCont
                 | "-" MulExp AddExpCont
                 | epsilon
      MulExp = number
      number = 0..9
  }
  */
  var Arithmetic = new Grammar();
  Arithmetic.addRule('Exp', nonTerminal('AddExp'));
  Arithmetic.addRule('AddExp', seq(nonTerminal('MulExp'), nonTerminal('AddExpCont')));
  Arithmetic.addRule('AddExpCont', choice(
    seq(terminal('+'), nonTerminal('MulExp'), nonTerminal('AddExpCont')),
    seq(terminal('-'), nonTerminal('MulExp'), nonTerminal('AddExpCont')),
    epsilon()
  ));
  Arithmetic.addRule('MulExp', nonTerminal('number'));
  Arithmetic.addRule('number', range('0', '9'));
  
  var examples = [
    '1 + 2',
    '1 +  ',
    //'3 - 3 + 2 + 1',
    '1'
  ];
  
  for (var i = 0; i < examples.length; i++) {
    var example = examples[i];
  	try {
      console.log(JSON.stringify(Arithmetic.parse(example, 'Exp')));
    } catch (e) {
      console.log('ERROR:', e.toString());
    }
  }
}

TOPLEVEL();