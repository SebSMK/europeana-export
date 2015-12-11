var express = require('express'),
path = require('path'),
logger = require("../logging"),
config = require('../config'), 
util = require('../util'),      
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
solr = require('solr-client'),
url = require('url');

var extract_result_key = function(result) {
  var keys = [];
  for (var key in result) {
    if (result.hasOwnProperty(key)) {
      keys.push(key);
    }
  }      
  return keys;    
};

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');      
  
  /*
  * get all connector info for a given picture and all versions of this picture
  * @id: picture's id
  */    
  router.get('/dam/foto/:id', function(req, res, next) {  
    var promise = [], connector, jsonResponse = {};           
    var id = req.params.id; 
    var fotokey = 'foto';         
        
    logger.info('ALLOWED: ' + req.method + ' ' + req.url);

    if (config.dam.hasOwnProperty(fotokey)) {
      var deferred = Q.defer();
      var invnumber;			
      
      // image connector 
      connector = config.dam[fotokey];
      var query = JSON.parse(JSON.stringify(connector.getconfig().def_query));       
      // get all versions of the given picture
      query['q'] = sprintf('{!join to=invnumber from=invnumber}id:%s', id);
      query['sort'] = 'created desc';
      query['fq'] =  'value:[* TO *]';
      query['rows'] =  '5';      
      
      return connector.handler(query)
      .then(function(result){
        // is there a picture with this id?                                       
        var connid = connector.getconfig().id;
        var res = result[connid];
        if(res.response.numFound > 0){
          jsonResponse[connid] = res;
          deferred.resolve(res.response.docs[0].invnumber);  
        }else{
          deferred.reject(sprintf('Igen foto svarer til id=%s', id));
        }; 
        
        return deferred.promise;                                           
      })
      .then(function(invnumber){
        // if yes, search the other connectors with corresponding inventar number
        for (var key in config.dam) {
    		  if (config.dam.hasOwnProperty(key) && key != fotokey) {
      			connector = config.dam[key];                                    
      			promise.push(connector.handler([invnumber], true)); 
    		  }
    		}
        
        Q.allSettled(promise).then(function(result) {
          //loop through array of promises, add items           
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
      })
      .catch(function (error) {
        logger.info(error);
        res.writeHead(404, 'Not found');
        res.write(sprintf('DAM: %s', error));
        res.end();        
      })      
    }                                                                  
  });
  
  /*
  * search string on all connectors  
  */
  router.get('/dam/search/*', function(req, res, next) {  
    var promise = [], connector;  
    var params = url.parse(req.url, true).query;            
    
    if (util.validateRequest(req, url, config)) {
      logger.info('ALLOWED: ' + req.method + ' ' + req.url);      
            
      // init and start request on all connectors
      //if( Object.prototype.toString.call( req.params ) === '[object Array]' && 
      //    req.params.length > 0){        
    		for (var key in config.dam) {
    		  if (config.dam.hasOwnProperty(key)) {
      			connector = config.dam[key]; 
      			//promise.push(connector.handler(req.params, true));
            promise.push(connector.handler(params, true)); 
    		  }
    		}                               
      //}                                        
    }else {
      logger.info('DENIED: ' + req.method + ' ' + req.url);
      res.writeHead(403, 'Illegal request');
      res.write('Multiproxy: access denied\n');
      res.end();
    } 
    
    Q.allSettled(promise).then(function(result) {
        //loop through array of promises, add items  
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
  });
  
  /*
  * get all versions of a given picture
  * @id: picture's id
  */    
  router.get('/dam/versions/:id', function(req, jsonres, next) {  
    var promise = [], connector, jsonResponse = {};           
    var id = req.params.id; 
    var fotokey = 'foto';         
        
    logger.info('ALLOWED: ' + req.method + ' ' + req.url);

    if (config.dam.hasOwnProperty(fotokey)) {            		
      
      // image connector 
      connector = config.dam[fotokey];
      var query = JSON.parse(JSON.stringify(connector.getconfig().def_query)); 
      query['q'] = sprintf('{!join to=invnumber from=invnumber}id:%s', id);
      query['sort'] = 'created desc';
      query['fq'] =  'value:[* TO *]';
      
      return connector.handler(query)
      .then(function(result){                                      
        var connid = connector.getconfig().id;
        var res = result[connid];
        if(res.response.numFound > 0){  
          jsonResponse[sprintf('versions_%s', connid)] = res;
          jsonres.jsonp(jsonResponse);            
        }else{
          var error = sprintf('Igen foto svarer til id=%s', id);
          logger.info(error);
          jsonres.writeHead(404, 'Not found');
          jsonres.write(sprintf('DAM: %s', error));
          jsonres.end();        
        };                                                       
      })      
      .catch(function (error) {
        logger.info(error);
        jsonres.writeHead(500, 'Server error');
        jsonres.write(sprintf('DAM: %s', error));
        jsonres.end();        
      })      
    }                                                                  
  });
}
