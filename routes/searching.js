var express = require('express'),
router = express(),
path = require('path'),
sprintf = require('sprintf-js').sprintf, 
request = require('request');

router.set('views', path.join(__dirname, '../views'));
router.set('view engine', 'jade');

router.get('/searching', function(req, res, next) {
  // input value from search
	var val = req.query.search !== undefined ? req.query.search.toLowerCase() : "";
	console.log(val);

	//var url = sprintf("http://csdev-seb:8180/solr-example/dev_DAM/select?q=invnumber%%3Akmssp721&wt=json&indent=true", );
	var url = sprintf("http://csdev-seb:8180/solr-example/dev_DAM/select?q=invnumber%%3A%s&wt=json&indent=true", val);

	//console.log(url);

	// request module is used to process the yql url and return the results in JSON format
	request(url, function(err, resp, body) {
		resultsArray = [];
		
		body = JSON.parse(body);

		//console.log(body);
		// logic used to compare search results with the input from user
		if (body.response.numFound == 0) {
			res.send("No results found. Try again.");
		} else {
			var results = body.response.docs;
			for (var i = 0; i < results.length; i++) {
				resultsArray.push(
						{invnumber:results[i]["invnumber"], 
						link:results[i]["link"], 
						created:results[i]["created"],
						size:results[i]["size"],
						id:results[i]["id"]}
				)
			}
			//console.log(resultsArray);
			res.send(resultsArray);			
		}

	});    
});

module.exports = router;
