var Q = require('q'),
    solr = require('solr-client'),
    sprintf = require('sprintf-js').sprintf;

var connector_CollectionSpace = {

    config: {
        id: 'CollectionSpace',
        connector: connector_CollectionSpace,
        host: 'csdev-seb-02',
        port: 8983,
        path: '/solr/dev_DAM_SAFO',
        def_query: {
            'q': '%1$s',            
            'qf': 'id_lower',
            'defType': 'edismax',
            'fl': '*, score',            
            'start': 0,
            'rows': 1,
            'wt': 'json',
            'indent': true,
            'json.nl': 'map'            
        }
    },

    handler: function(params, use_def_query) {
        var deferred = Q.defer();
        var client = this.client(this.config);
        var res = {},
            query = {};
        var self = this;
        
        query = self.queryhandler(params, use_def_query);                

        client.get('select', query, function(err, obj) {

            if (err) {
                res[self.config.id] = err;
                deferred.reject(res);
            } else { 
                res[self.config.id] = obj;
                deferred.resolve(res);
            }
        });
        return deferred.promise;
    },

    queryhandler: function(params, use_def_query){
       var query = {};
       if (use_def_query) {                   
            query = JSON.parse(JSON.stringify(this.config.def_query)); // cloning JSON
            
            for (var p in params){
              var paramPrefix = p.split('.')[0]; 
              
              switch(paramPrefix) {
                case 'q':
                  query['q'] = sprintf(query['q'], params[p].toString());
                  break;                  
                default:
                  query[paramPrefix] = params[p];                      
              }                                                           
            }                          
        } else {
            query = params;
        }            
        return query;
    },

    client: function(config) {
        return solr.createClient(config.host, config.port, '', config.path);
    },
    
    setconfig: function(config) {
        this.config = config || this.config;
    },
    
    getconfig: function(){
        return this.config;
    }  
}

module.exports = connector_CollectionSpace;