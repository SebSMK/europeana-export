
var Q = require('q'),
    http = require('http'),
    logger = require("./logging"),
    sprintf = require('sprintf-js').sprintf;

Solr = (function() {

    /**
     * Constructor
     **/
    function Solr (host, port, core) {
        logger.info("Solr Constructor", host + ':' + port);
        this.host = host;
        this.port = port;
        this.core = core;
    }

    /**
     * Instance Methods 
     **/
    Solr.prototype.get2 = function(path, params) {    
        var reqpath = path + processParams(params);
        var deferred = Q.defer(),
            options = {
                host: this.host,
                port: this.port,
                path: reqpath,
                method: 'GET'
            };

        logger.info('OPTIONS: ', JSON.stringify(options, null, 4));
        var get = http.get(options, function (resp) {

            var data = '';
            logger.info('STATUS: ' + resp.statusCode);
            logger.info('HEADERS: ' + JSON.stringify(resp.headers));  
            resp.setEncoding('utf8');

            resp.on('data', function(chunk) {
                data += chunk;
            });
            resp.on('end', function() {
                if (data !== ''){
                    var jsonData = JSON.parse(data);
                    logger.debug("Solr: response received", JSON.stringify(jsonData, null, 4));
                    deferred.resolve(jsonData);
                }else{
                    logger.error("Solr: empty GET result returned");
                    deferred.reject("Solr: empty GET result returned");
                }
            });
            resp.on('error', function(err) {
                logger.error("Solr: http.request GET error: " + err);
                deferred.reject(err);
            });
        });
        
        get.on('error', function(e) {
            logger.error("Solr:", e.message);
            deferred.reject("Solr:" + e.message);
        });
        
        return deferred.promise;
    }
    
    Solr.prototype.get = function(path) {
        var deferred = Q.defer(),
            options = {
                host: this.host,
                port: this.port,
                path: path,
                method: 'GET'
            };

        var get = http.get(options, function (resp) {

            var data = '';
            logger.info('STATUS: ' + resp.statusCode);
            logger.info('HEADERS: ' + JSON.stringify(resp.headers));  
            resp.setEncoding('utf8');

            resp.on('data', function(chunk) {
                data += chunk;
            });
            resp.on('end', function() {
                if (data !== '' && data.indexOf('"error":') == -1){
                    var jsonData = JSON.parse(data);
                    logger.debug("Solr: response received", JSON.stringify(jsonData, null, 4));
                    deferred.resolve(jsonData);
                }else{
                    logger.error("Solr: empty GET result returned");
                    deferred.reject("Solr: empty GET result returned");
                }
            });
            resp.on('error', function(err) {
                logger.error("Solr: http.request GET error: " + err);
                deferred.reject(err);
            });
        });
        
        get.on('error', function(e) {
            logger.error("Solr:", e.message);
            deferred.reject("Solr:" + e.message);
        });
        
        return deferred.promise;
    }
    
    Solr.prototype.postjson = function(postjson) {
    
        var post_data = JSON.stringify(postjson);
    
        var deferred = Q.defer(),
        options = {
          host: this.host,
          port: this.port,
          path: this.core + 'update/?commit=true',
          headers: {
              'Content-Type': 'application/json'
          },
          method: 'POST'
        };
        
        var post = http.request(options, function(resp) {          
          var data = '';
          logger.info('STATUS: ' + resp.statusCode);
          logger.info('HEADERS: ' + JSON.stringify(resp.headers));  
          resp.setEncoding('utf8');
          resp.on('data', function(chunk) {
                data += chunk;
            });
          resp.on('end', function() {
              if (data !== '' && data.indexOf('"error":') == -1){
                  var jsonData = JSON.parse(data);
                  logger.debug("Solr: response received", JSON.stringify(jsonData, null, 4));
                  deferred.resolve(jsonData);
              }else{
                  logger.error("Solr: empty postjson result returned");
                  deferred.reject(data);
              }
          });
          resp.on('error', function(err) {
              logger.error("Solr: http.request postjson error: " + err);
              deferred.reject(err);
          });
        });
                
        post.on('error', function(e) {
          logger.error("Solr:", e.message);
          deferred.reject("Solr:" + e.message);
        });
        
        // write data to request body
        post.write(post_data);
        
        post.end();            
        
        
        return deferred.promise;
    }
    
    
    /***
     * PRIVATE
     **/    
    processParams = function(solrParams){
            var solrReq = [];

            for (var key in solrParams) {
                if (solrParams.hasOwnProperty(key)) {
                    solrReq.push(sprintf('%s=%s', key, encodeURIComponent(solrParams[key])));
                }
            }            
            return solrReq.join('&');    
    }                
    
    return Solr;
})();

module.exports = Solr;
