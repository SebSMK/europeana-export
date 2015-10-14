
var Q = require('q'),
    http = require('http'),
    logger = require("./logging");

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
                if (data !== ''){
                    var jsonData = JSON.parse(data);
                    logger.debug("Solr: response received", JSON.stringify(jsonData, null, 4));
                    deferred.resolve(jsonData);
                }else{
                    logger.error("Solr: empty GET result returned");
                    deferred.reject();
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
              if (data !== ''){
                  var jsonData = JSON.parse(data);
                  logger.debug("Solr: response received", JSON.stringify(jsonData, null, 4));
                  deferred.resolve(jsonData);
              }else{
                  logger.error("Solr: empty postjson result returned");
                  deferred.reject();
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
    
   /* 
    Solr.prototype.update = function (data, callback) {
        var self = this;
        this.options.json = JSON.stringify(data);
        this.options.fullPath = [this.options.path, this.options.core, 'update/json?commit=' + this.autoCommit + '&wt=json']
            .filter(function (element) {
                if (element) {
                    return true;
                }
                return false;
            })
            .join('/');
        updateRequest(this.options, callback);

        return self;
    }
     */
    
    return Solr;
})();

module.exports = Solr;
