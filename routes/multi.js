var express = require('express'),
path = require('path'),
logger = require("../logging"),
config = require('../config'), 
util = require('../util'),      
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
solr = require('solr-client'),
url = require('url');

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');  
  
  router.get('/multi/*', function(req, res, next) {
  
    var promise = [];  
    var query = url.parse(req.url, true).query;            
    
    if (util.validateRequest(req, url, config)) {
      logger.info('ALLOWED: ' + req.method + ' ' + req.url);
      var connector;
            
      // init and start request on all connectors
      if( Object.prototype.toString.call( req.params ) === '[object Array]' && 
          req.params.length > 0){        
    		for (var key in config.proxy.mapping) {
    		  if (config.proxy.mapping.hasOwnProperty(key)) {
      			connector = config.proxy.mapping[key]; 
      			promise.push(connector.handler(req.params, true)); 
    		  }
    		}                               
      }                                        
    }else {
      logger.info('DENIED: ' + req.method + ' ' + req.url);
      res.writeHead(403, 'Illegal request');
      res.write('Multiproxy: access denied\n');
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
                var key = extract_result_key(prom.reason);
                jsonResponse[key] = prom.reason[key].message;
                
            }
        });
        promise = []; //empty array, since it's global.                       
        res.jsonp(jsonResponse);
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
