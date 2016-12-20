queryCalls(call => call.isError).select('text').style('fill', 'red');
queryCalls(call => 'goal' in call.tags)
	.select('g.info')
		.append('text')
			.text(call => call.tags.goal + ' ' + call.tags.current)
			.style('font-family', 'bookerly')
			.style('font-size', '8px');
nextSwatch(queryCalls(callsWithSameArgument('subsetSumsTo')));


// -------------------------------------

function TOPLEVEL() {
  console.log(canBeDivided([1,0,1,2,0,0]));
  console.log(canBeDivided([1,0,0,0,1,1]));
  console.log(canBeDivided([1,0,3,0,4,4]));
  console.log(canBeDivided([1,41,1342,243,3,4]));
}

TOPLEVEL();

function canBeDivided(values) {
  var nonZeroValues = values.filter(
    function(value) { return value !== 0; }
  );
  
  var goal = nonZeroValues.reduce(function(agg, b) {
    return agg + b;
  }) / 2;
  
  if (goal % 1 !== 0) {
    return false;
  }
  
  return subsetSumsTo(nonZeroValues, goal);
}

function subsetSumsTo(set, goal) {
  TAG('goal', goal);
  
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