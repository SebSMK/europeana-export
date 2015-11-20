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


/*
var options = {
      validHttpMethods: ['GET'],
      //validPaths: ['solr-example/dev_DAM/select', ''],
      invalidParams: ['qt', 'stream'],
      backend_user_tags: {
        host: 'solr-02.smk.dk',
        port: 8080,
        path: '/solr-h4dk/prod_search_pict',
        query: {
          'q': '{!join from=picture_url to=picture_url}prev_q:',
          'facet': true,
          'facet.field':['prev_q'],
          'facet.mincount':1,
          'facet.limit':-1,
          'rows':'0', 
          'wt':'json',
          'indent':true,
          'json.nl':'map'            
        }              
      },                  
      
      backend: { // HARD-CODED!!!!!!
        host: 'csdev-seb',
        port: 8180,
        path: '/solr-example/dev_DAM'
      }
    }; 
*/
module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');  

  router.get('/proxy/*', function(req, res, next) {
  
    var validateRequest = function(request, options) {
                
        if( Object.prototype.toString.call( request.params ) !== '[object Array]' ||
            request.params.length == 0)
          return false;
                
        var parsedUrl = url.parse(request.params[0], true),
        path = parsedUrl.pathname,        
        queryParams = url.parse(request.url, true).query;
  
        return options.validHttpMethods.indexOf(request.method) !== -1 &&
           //options.validPaths.indexOf(path) !== -1 &&
           function(){
             for (var p in queryParams){
               var paramPrefix = p.split('.')[0]; // invalidate not just "stream", but "stream.*"
               return options.invalidParams.indexOf(paramPrefix) === -1;
             }
           
           };
    };    
  
    var query = url.parse(req.url, true).query;
    
    if (validateRequest(req, config.options)) {
      logger.info('ALLOWED: ' + req.method + ' ' + req.url);
      var client;
      
      if(Object.keys(query).length > 0){
        // request on a given solr  
        client = solr.createClient(config.options.backend.host, config.options.backend.port, '', config.options.backend.path);      
      }
      else{
        // general request
        if( Object.prototype.toString.call( req.params ) === '[object Array]' && 
            req.params.length > 0){
          
          // request on "user tags"
          client = solr.createClient(config.options.backend_user_tags.host, config.options.backend_user_tags.port, '', config.options.backend_user_tags.path);          
          query = JSON.parse(JSON.stringify(config.options.backend_user_tags.query)); // cloning JSON 
          query['q'] += req.params;                                       
        }                        
      }
      
      client.get('select', query, function(err, obj){
        	if(err){
        		logger.info(err);
            res.writeHead(500, 'Server intern error');
            res.write('solrProxy says: ' + err);
            res.end();
        	}else{
        		logger.info(obj);        
            res.jsonp(obj);        
        	}
      });
      
       
    }else {
      logger.info('DENIED: ' + req.method + ' ' + req.url);
      res.writeHead(403, 'Illegal request');
      res.write('solrProxy: access denied\n');
      res.end();
    }      
    
   
  });
}
