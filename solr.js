var Q = require('q'),
    solr = require('solr-client'),
    sprintf = require('sprintf-js').sprintf;

SolrConnector = (function(){

     /**
     * Constructor
     **/
     
    function SolrConnector (config) {        
        console.log("SolrConnector Constructor:", JSON.stringify(config));
        this.config = config;              
    }          


     /**
     * Public methods
     **/
    
    SolrConnector.prototype.queryhandler = function(params, use_def_query){
       var query = {};
       if (use_def_query) {                   
            
            // set variables elements of the query
            query = JSON.parse(JSON.stringify(this.config.query.def)); // cloning JSON            
            for (var p in params){              
              if(this.config.query.exclude === undefined || (this.config.query.exclude !== undefined && this.config.query.exclude.indexOf(p) == -1)) // only if the parameter is not in the exclude list
                query[p] = params[p];                                                                         
            } 
            
            // set fixed elements of the query            
            for (var f in this.config.query.fixed){              
              switch(f) {
                case 'q':
                    var qval = params[f] === undefined ? '*:*' : params[f].toString(); 
                    query[f] = sprintf(this.config.query.fixed[f], qval); 
                  break;
                default:
                  query[f] = this.config.query.fixed[f];                                                  
              }                                                           
            } 
                                     
        } else {
            query = params;
        }            
        return query;
    };
    
    SolrConnector.prototype.handler = function(params, use_def_query, queryhandler) {
        var deferred = Q.defer();
        var client = this.client(this.config);
        var res = {},
            query = {};
        var self = this;
       
        var getquery = queryhandler !== undefined ? queryhandler : self.queryhandler; 
        query = getquery.call(self, params, use_def_query);
        
        console.log(query);
        
        client.get('select', query, function(err, obj) {

            if (err) {                
                var solr_client_err_message = err.message.split("\r\n")[0];                                                
                deferred.reject(JSON.parse(solr_client_err_message));
            } else {                 
                deferred.resolve(obj);
            }
        });
        return deferred.promise;
    };   

    SolrConnector.prototype.client = function(config) {
        return solr.createClient(config.host, config.port, '', config.core);
    };
    
    SolrConnector.prototype.setconfig = function(config) {
        this.config = config || this.config;
    };
    
    SolrConnector.prototype.getconfig = function(){
        return this.config;
    };  
            
    return SolrConnector;
})();


module.exports = SolrConnector;

