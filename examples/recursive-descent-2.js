// show error messages
calls
	.query(call => call.hasOwnProperty('throws'))
	.info(call => call.throws.message)
	.selectAll('text')
		.style('fill', 'red');

// show the consumed character
calls
	.query(call => call.fnName === 'InputStreamConsumeChar')
	.info(call => call.args[0]);

// Mark every place where a character is consumed
calls
	.query(call => call.fnName.includes('InputStreamConsume'))
	.nextSwatch()

// show returned character in InputStreamConsume
calls.query(call => 'nextChar' in call.tags)
	.info(call => JSON.stringify(call.tags.nextChar) + ' ; ' + call.args[0]);

// show position, string length in calls to finished
calls.query(call => 'position' in call.tags)
	.info(call => `${call.tags.position} ; ${call.tags.dataLength}`);

calls.query(call => call.fnName === 'makeAstNode')
	.collapse()
	.select('line')
		.style('stroke', swatches(5));
    

calls.query(call => call.fnName === 'parseArithmetic')
	.info(call => call.args[0]);

    // ---------------------------------------------------------

    /*
Arithmetic {
	Exp = AddExp
    AddExp = MulExp AddExpCont
    AddExpCont = "+" MulExp AddExpCont
    	       | "-" MulExp AddExpCont
               | epsilon
    MulExp = PriExp MulExpCont
    MulExpCont = "*" PriExp MulExpCont
               | "/" PriExp MulExpCont
               | epsilon
    PriExp = "(" Exp ")"
    	   | number
    number = 0..9
}
*/

function ConsumeError(message) {
  this.message = message;
}

ConsumeError.prototype.toString = function() { return this.message; }

function ParseError(message) {
  this.message = message;
}

ParseError.prototype.toString = function() { return this.message; }


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

function makeAstNode(type) {
  return {
    type: type,
    children: []
  };
}

function inRange(char, start, end) {
  var startCharCode = start.charCodeAt(0);
  var endCharCode = end.charCodeAt(0);
  var charCode = char.charCodeAt(0);
  
  return startCharCode <= charCode && endCharCode >= charCode;
}

function parseArithmetic(input) {
  var stream = new InputStream(input);
  TAG('hasConsume', true);
  TAG('consume', stream.consume);
  return parseExp(stream);
}

function parseExp(stream) {
  let ans = parseAddExp(stream);
  if (stream.finished()) {
    return ans;
  } else {
    console.log(JSON.stringify(ans));
    throw new ParseError('stream still has characters: ' + JSON.stringify(stream.data.slice(stream.position)));
  }
}

// AddExp = MulExp AddExpCont
function parseAddExp(stream) {
  var me = parseMulExp(stream);
  var aeCont = parseAddExpCont(stream);
  
  var ans = makeAstNode('addExp');
  ans.children.push(me);
  ans.children.push(aeCont);
  
  return ans;
}

// AddExpCont = "+" MulExp AddExpCont
//            | epsilon
function parseAddExpCont(stream) {
  var startPos = stream.position;
  var ans;
  try { // "+" MulExp AddExpCont
    stream.consumeChar('+');
    var me = parseMulExp(stream);
    var aeCont = parseAddExpCont(stream);
    
    ans = makeAstNode('addExpCont');
    ans.children.push(me);
    ans.children.push(aeCont);
  } catch (e) { // epsilon
    //if (e instanceof ConsumeError) {
    //  throw e;
    //}
    stream.position = startPos;
    ans = makeAstNode('addExpCont');
  }
    
  return ans;
}

// MulExp = PriExp MulExpCont
function parseMulExp(stream) {
  var pe = parsePriExp(stream);
  var meCont = parseMulExpCont(stream);
  
  var ans = makeAstNode('mulExp');
  ans.children.push(pe);
  ans.children.push(meCont);
  return ans;
}

// MulExpCont = epsilon
function parseMulExpCont(stream) {
  return makeAstNode('mulExpCont');
}

// PriExp = number
function parsePriExp(stream) {
  return parseNumber(stream);
}

// number = 0..9
function parseNumber(stream) {
  var char = stream.consume();
  if (inRange(char, '0', '9')) {
    var ans = makeAstNode('number');
    ans.value = char;
    return ans;
  } else {
    throw new Error('invalid number');
  }
}

function TOPLEVEL() {
  console.log(JSON.stringify(parseArithmetic('1 + 2')));
  console.log(JSON.stringify(parseArithmetic('1 + ')));
}
TOPLEVEL();
