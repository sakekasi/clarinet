// show error messages
calls
	.query(call => call.hasOwnProperty('throws'))
	.info(call => call.throws.message || 'undefined');

calls.refresh();
calls
	.query(call => call.hasOwnProperty('throws'))
	.selectAll('text')
		.style('fill', 'red');

calls.query(call => call.fnName === 'b')
	.query(call => call.parent.fnName === 'recur')
	.collapse()
	.select('line')
		.style('stroke', swatches(3));

calls.query(call => call.fnName === 'fib')
	.info(call => call.args[0] + ' ; ' + call.returnValue)
	.nextSwatch(1);

calls.query(call => call.fnName === 'fact')
	.info(call => call.args[0] + ' ; ' + call.returnValue)
	.nextSwatch(2);

calls.query(call => call.fnName === 'recur')
	.info(call => call.args[0]);

// ------------------------------

(function TOPLEVEL(y) {
	console.log(y(
		function factProto(givenFact) {
			return function fact(n) {
				if( n < 2 ) return 1;
				else return n * givenFact(n-1);
			}
		}
	)(5)); // Outputs 120 
	
	console.log(y(
		function fibProto(givenFib) {
			return function fib(n) {
				if( n<=2 ) return 1;
				else return givenFib(n-1) + givenFib(n-2);
			}
		}
	)(6)); // Outputs 5
	
})(
	function y(proto) {
		return (function a(b) { 
			return b(b); 
		})(function b(b) {
			return proto(
				function recur(x) { return (b(b))(x); }
			);
		});
	}
);