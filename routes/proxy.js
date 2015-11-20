var express = require('express'),
//router = express(),
path = require('path'),
logger = require("../logging"),
config = require('../config'),
converter = require('../converter'), 
//Solr = require('../solr'),
iipproxy = require('../iip'),       
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
fs = require('fs'),    
Image = require('../image'),
upath = require('upath'),
request = require('request'),
solr = require('solr-client'),
url = require('url');
 

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');  

  router.get('/proxy/*', function(req, res, next) {
  
    var options = {
      listenPort: 8008,
      validHttpMethods: ['GET', 'POST'],
      validPaths: ['/solr-example/dev_DAM/select', '/'],
      invalidParams: ['qt', 'stream'],
      backend: {
        host: 'csdev-seb',
        port: 8180,
        path: '/solr-example/dev_DAM'
      }
    };
  
    var query = url.parse(req.url, true).query;
    var client = solr.createClient(options.backend.host, options.backend.port, '', options.backend.path);
    client.get('select', query, function(err, obj){
    	if(err){
    		console.log(err);
        res.writeHead(500, 'Server intern error');
        res.write('solrProxy says: ' + err);
        res.end();
    	}else{
    		console.log(obj);        
        res.jsonp(obj);        
    	}
    });
  });
}
