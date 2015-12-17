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
        query:{
          def: {                                   
            'wt': 'json',
            'indent': true,
            'json.nl': 'map'            
          },
          fixed: {
            'q': '%1$s',            
            'qf': 'id_lower',            
            'fl': '*, score', 
            'defType': 'edismax',
            'start': 0,
            'rows': 1
          },
          exclude: ['fq']
        }
    },
    
    queryhandler: function(params, use_def_query){
       var query = {};
       if (use_def_query) {                   
            
            // set variables elements of the query
            query = JSON.parse(JSON.stringify(this.config.query.def)); // cloning JSON            
            for (var p in params){              
              if(this.config.query.exclude !== undefined && this.config.query.exclude.indexOf(p) == -1) // only if the parameter is not in the exclude list
                query[p] = params[p];                                                                         
            } 
            
            // set fixed elements of the query            
            for (var f in this.config.query.fixed){              
              switch(f) {
                case 'q':
                  query[f] = sprintf(this.config.query.fixed[f], params[f].toString());
                  break;
                default:
                  query[f] = this.config.query.fixed[f];                                                  
              }                                                           
            } 
                                     
        } else {
            query = params;
        }            
        return query;
    },

    handler: function(params, use_def_query, queryhandler) {
        var deferred = Q.defer();
        var client = this.client(this.config);
        var res = {},
            query = {};
        var self = this;
       
        var getquery = queryhandler !== undefined ? queryhandler : self.queryhandler; 
        query = getquery.call(self, params, use_def_query);

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