calls
	.query(call => call.isError)
	.selectAll('text')
		.style('color', 'red');

// --------------------------------------

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

function TOPLEVEL() {
  console.log(JSON.stringify(parseArithmetic('1 + 2')));
}
TOPLEVEL();

function InputStream(string) {
  this.data = string;
  this.position = 0;
}

InputStream.prototype.consumeChar = function InputStreamConsumeChar(char) {
  var nextChar = this.data.charAt(this.data.position++);
  if (nextChar !== char) {
    throw new Error('cant consume');
  }
  return nextChar;
};

InputStream.prototype.consume = function InputStreamConsume() {
  var nextChar = this.data.charAt(this.data.position++);
  return nextChar;
};

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
  return parseExp(stream);
}

function parseExp(stream) {
  return parseAddExp(stream);
}

function parseAddExp(stream) {
  var ae = parseAddExp(stream);
  stream.consumeChar('+');
  var me = parseMulExp(stream);
  
  var ans = makeAstNode('addExp');
  ans.children.push(ae);
  ans.children.push(me);
}

function parseMulExp(stream) {
  return parsePriExp(stream);
}

function parsePriExp(stream) {
  return parseNumber(stream);
}

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
