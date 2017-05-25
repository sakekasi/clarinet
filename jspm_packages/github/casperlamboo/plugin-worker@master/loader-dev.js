/* */ 
"format cjs";
var WorkerShim = require('./WorkerShim.js');

exports.fetch = function(load) {
  // create code string to be used in the worker
  // code loads the worker in load.address
  // when it is finished loading the worker post @@@LOADED@@@
  // note: jspm.config.js can be located differently, not sure how to handle this
  var codeStr = [
    'importScripts(' + JSON.stringify(System.scriptSrc) + ');',
    'System.config(' + JSON.stringify(System.getConfig()) + ');',

    // Because System.import is async we need a worker shim to catch all messages
    'System.import(' + JSON.stringify(load.address) + ').then(function() {',
    '  self.postMessage("@@@LOADED@@@");',
    '}).catch(function(error) {',
    '  console.warn(error);',
    '});'
  ].join('\n');
  // convert string to url
  var blob = new Blob([codeStr]);
  var blobURL = self.URL.createObjectURL(blob);

  load.metadata.Worker = WorkerShim.bind(null, blobURL);

  return '';
};

exports.instantiate = function(load) {
  return load.metadata.Worker;
};
