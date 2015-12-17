var express = require('express'),
path = require('path'),
logger = require("../logging"),
config = require('../config'), 
Solr = require('../solr'),       
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
fs = require('fs'),
connector = require('../connector_doc_smk');
 

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');  

  router.get('/download/doc/*', function(req, res, next) {     
    var filePath = sprintf('/%s', req.params.toString());               
    var stat = fs.statSync(filePath);
    
    logger.info('document download: ' + filePath);        

    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        //'Content-Disposition': sprintf('attachment; filename=%s', filePath.split('/').pop())
    });

    var readStream = fs.createReadStream(filePath);
    // We replaced all the event handlers with a simple call to readStream.pipe()
    readStream.pipe(res);
    
  });
  
  router.get('/doc/get/*', function(req, res, next) {     
    var query = {};
    query['q'] = req.params;
    
    //send request
    connector.handler(query, true)
    .then(function(solrTagResponse) {
        var id = connector.getconfig().id; 
        if (solrTagResponse[id].response.numFound > 0) {
            res.jsonp(solrTagResponse[id]);
        }else {
            logger.info("/doc/get - object not found");
            throw ({error: "/doc/get - object not found"});
        }
    })
    .catch(function (error) {
        logger.info(error);
        res.writeHead(500, 'Server Error');
        res.write(sprintf('Document: %s', error));
        res.end();        
      })      
    
    
  });
}
