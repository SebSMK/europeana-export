var express = require('express'),
path = require('path'),
logger = require("../logging"),
config = require('../config'), 
Solr = require('../solr'),       
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
connector = require('../connector_doc_smk');
 

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');  

  router.get('/doc/get/:search', function(req, res, next) {     
    var query = req.params.search;
    
    //send request
    connector.handler(query, true)
    .then(function(solrTagResponse) {
        var id = connector.getconfig().id; 
        if (solrTagResponse[id].response.numFound > 0) {
            res.jsonp(solrTagResponse[id]);
        }else {
            logger.info("/doc/get tag - object not found");
            throw ({error: "/doc/get tag - object not found"});
        }
    })
    .catch(function(err) {
        logger.error('/doc/get', err);
        res.send(version + '<br>/doc/get error: <br>' + err);
    });
    
  });
}
