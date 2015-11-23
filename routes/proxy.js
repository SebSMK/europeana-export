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
  
    var promise = [];
      
    var validateRequest = function(request) {
                
        if( Object.prototype.toString.call( request.params ) !== '[object Array]' ||
            request.params.length == 0)
          return false;
                
        var parsedUrl = url.parse(request.params[0], true),
        path = parsedUrl.pathname,        
        queryParams = url.parse(request.url, true).query,
        backend = config.proxy.mapping[url.parse(req.params[0], true).pathname];
  
        return config.options.validHttpMethods.indexOf(request.method) !== -1 &&
           //config.options.validPaths.indexOf(path) !== -1 &&
           backend !== undefined &&
           function(){
             for (var p in queryParams){
               var paramPrefix = p.split('.')[0]; // invalidate not just "stream", but "stream.*"
               return config.options.invalidParams.indexOf(paramPrefix) === -1;
             }           
           };
    };    
  
    var query = url.parse(req.url, true).query;
    
    var user_tags_connector = function(client, query){
      var deferred = Q.defer();
      client.get('select', query, function(err, obj){
          
        	if(err){
        		logger.info(err);
            deferred.reject(err);
            /*
            res.writeHead(500, 'Server intern error');
            res.write('solrProxy says: ' + err);
            res.end();*/
            
        	}else{
        		logger.info(obj);    
            deferred.resolve({'user_tags': obj});
            //deferred.resolve(obj);    
            /*res.jsonp(obj);*/                      
        	}                      
      });                
      return deferred.promise;
    };             
    
    
    
    if (validateRequest(req)) {
      logger.info('ALLOWED: ' + req.method + ' ' + req.url);
      var client;      
      
      if(Object.keys(query).length > 0){
        // request on a given solr
        var backend = config.proxy.mapping[url.parse(req.params[0], true).pathname];
        client = solr.createClient(config.options.backend[backend].host, config.options.backend[backend].port, '', config.options.backend[backend].path);      
      }
      else{
        // general request
        if( Object.prototype.toString.call( req.params ) === '[object Array]' && 
            req.params.length > 0){
          
          // request on "user tags"
          client = solr.createClient(config.options.backend_user_tags.host, config.options.backend_user_tags.port, '', config.options.backend_user_tags.path);          
          query = JSON.parse(JSON.stringify(config.options.backend.user_tags.query)); // cloning JSON 
          query['q'] += req.params;                                      
        }                        
      }
      
      promise.push(user_tags_connector(client, query));
                   
    }else {
      logger.info('DENIED: ' + req.method + ' ' + req.url);
      res.writeHead(403, 'Illegal request');
      res.write('solrProxy: access denied\n');
      res.end();
    } 
    
    Q.allSettled(promise).then(function(result) {
        //loop through array of promises, add items  
        var tosend = [];
        var jsonResponse = {};
        
        result.forEach(function(prom) {
            if (prom.state === "fulfilled") {
                //res.write("-- SUCCESS: " + prom.value);
                var key = extract_result_key(prom.value);
                jsonResponse[key] = prom.value[key];
            }
            if (prom.state === "rejected") {
                //res.write("-- ERROR: " + prom.reason);
                jsonResponse[key] = prom.value[key];
            }
        });
        promise = []; //empty array, since it's global.        
        /*
        res.writeHead(200, 'Server OK');
        res.write('solrProxy OK.' + JSON.stringify(jsonResponse));
        res.end();*/
        
        res.send(jsonResponse);
    });     
    
    var extract_result_key = function(result) {
      var keys = [];
      for (var key in result) {
        if (result.hasOwnProperty(key)) {
          keys.push(key);
        }
      }      
      return keys;    
    };
  });
}
