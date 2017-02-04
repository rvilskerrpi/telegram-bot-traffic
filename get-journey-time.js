var journeyUrl = require('system').args[1];
var page = require('webpage').create();

page.onLoadFinished = function() {
  // Print journey time to stdout
  console.log(page.plainText.split('Leave now')[1].split('(')[0].trim());
  phantom.exit();
}

page.open(journeyUrl);
