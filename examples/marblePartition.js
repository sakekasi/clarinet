
calls
	.query(call => call.isError)
	.select('text')
	.style('fill', 'red');

var a = calls
	.query(call => 'goal' in call.tags)

a.info(call => call.tags.goal + ' ; ' + (call.tags.current || ''));

a
  .query(call => call.children.length === 0 && call.tags.goal < 0)
  .select('rect')
	.style('fill', swatches(0));

a
  .query(call => call.children.length === 0 && call.tags.goal > 0)
  .select('rect')
	.style('fill', swatches(1));

calls
	.query(call => call.parent && call.parent.fnName === 'Array.filter')
	.collapse()

calls
	.query(call => call.fnName === 'Array.reduce')
	.collapse()
	.select('line')
	.style('stroke', swatches(4));

calls
	.query(call => call.fnName === 'Array.filter')
	.collapse()
	.select('line')
	.style('stroke', swatches(2));


calls
	.query(call => call.fnName === 'canBeDivided')
	.info(call => call.args[0])
    
//calls
//	.query(call => call.fnName === 'TOPLEVEL')
//	.collapse();



// -------------------------------------

function TOPLEVEL() {
  console.log(canBeDivided([1,0,1,2,0,0]));
  console.log(canBeDivided([1,0,0,0,1,1]));
  console.log(canBeDivided([1,0,3,0,4,4]));
  console.log(canBeDivided([1,41,342,243,35,40]));
}

TOPLEVEL();

function canBeDivided(values) {
  var nonZeroValues = values.filter(
    function (value) { return value !== 0; }
  );
  
  var goal = nonZeroValues.reduce(function (agg, b) {
    return agg + b;
  }) / 2;
  
  if (goal % 1 !== 0) {
    return false;
  }
  
  return subsetSumsTo(nonZeroValues, goal);
}

function subsetSumsTo(set, goal) {
  TAG('goal', goal);
  TAG('set', set);
  
  if (goal === 0) {
    return true;
  } else if (goal < 0) {
    return false;
  } else if (set.length === 0) {
    return false;
  }
  
  var current = set[0];
  TAG('current', current);
  return subsetSumsTo(set.slice(1), goal-current) || // use this one
    subsetSumsTo(set.slice(1), goal); // skip this one
}