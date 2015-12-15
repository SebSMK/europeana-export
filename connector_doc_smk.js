var Q = require('q'),
    solr = require('solr-client'),
    sprintf = require('sprintf-js').sprintf;

var connector_doc_smk = {

    config: {
        id: 'doc_smk',
        connector: connector_doc_smk,
        host: '172.20.1.61',
        port: 8984,
        path: '/solr/gettingstarted_shard1_replica1',       
        query:{
          def: {                                                
            'wt': 'json',
            'indent': true,
            'json.nl': 'map'            
          },
          fixed: {
            'facet': false,
            'q': '%s',
            'fq': '*',
            'fl': 'score, id, author, creation_date, resourcename, page_count, word_count, compagny'
          },
          exclude: ['qf']
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

module.exports = connector_doc_smk;