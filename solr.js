
var Q = require('q'),
    http = require('http'),
    logger = require("./logging");

Solr = (function() {

    /**
     * Constructor
     **/
    function Solr (host, port) {
        logger.info("Solr Constructor", host + ':' + port);
        this.host = host;
        this.port = port;
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
    return Solr;
})();

module.exports = Solr;
