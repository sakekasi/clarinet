queryCalls(call => call.isError).select('text').style('fill', 'red');
queryCalls(call => 'list' in call.tags)
	.select('g.info')
	.append('text')
		.text(call => call.tags.list
              .map((item, i) => ((i === call.tags.start) || (i === call.tags.end-1)) ? '*'+item+'*' : item)
        )
		.style('font-size', '8px')
		.style('font-family', 'Bookerly');

let partitionInfo = queryCalls(call => 'before' in call.tags)
	.select('g.info');
partitionInfo
	.append('text')
		.text(call => call.tags.before
           	.map((item, i) => ((i === call.args[1]) || (i === call.args[2]-1)) ? '*'+item+'*' : item)
        )
		.style('font-size', '8px')
		.style('font-family', 'Bookerly');
partitionInfo
	.append('text')
		.text(call => call.tags.after
           	.map((item, i) => ((i === call.args[1]) || (i === call.args[2]-1)) ? '*'+item+'*' : item)
        )
		.style('font-size', '8px')
		.style('font-family', 'Bookerly')
		.attr('transform', 'translate(0, 10)');

//-----------------------------------------

function quicksort(list) {
  quicksortHelper(list, 0, list.length);
  return list;
}

function quicksortHelper(list, start, end) {
  if ((end - start) <= 1) {
    return;
  }
  
  TAG('start', start);
  TAG('end', end);
  TAG('list', list.slice());
  var mid = partition(list, start, end);
  quicksortHelper(list, start, mid);
  quicksortHelper(list, mid === start ? mid+1 : mid, end);
}

function partition(list, start, end) {
  var partIndex = start;
  for (var i = start+1; i < end; i++) {
    var current = list[i];
    if ( current < list[partIndex] ) {
      list.splice(i, 1);
      list.splice(partIndex, 0, current);
//      swap(list, i, partIndex);
      partIndex++;
    }
  }
  return partIndex;
}

function swap(list, a, b) {
  var temp = list[a];
  list[a] = list[b];
  list[b] = temp;
}

function TOPLEVEL() {
  console.log(quicksort([4,9,12,3,-100, 6]));
}

TOPLEVEL();