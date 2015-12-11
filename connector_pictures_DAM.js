var Q = require('q'),
    solr = require('solr-client'),
    sprintf = require('sprintf-js').sprintf;

var connector_pictures_DAM = {

    config: {
        id: 'pictures_DAM',
        connector: connector_pictures_DAM,
        host: 'csdev-seb-02',
        port: 8983,
        path: '/solr/dev_DAM_PIC',
        def_query: {
            //'q': '{!join to=invnumber from=id_lower fromIndex=dev_DAM_SAFO score=max}{!edismax qf="collectorExact1^150 collectorExact2^30 collectorExact3^20 collector1^20 collector2^15 collector3^10 collector4^5"}%1$s',
            //'q': 'value:[* TO *] AND ({!join from=invnumber to=invnumber fromIndex=dev_TAGS_PIC score=max}prev_q:%1$s OR {!join to=invnumber from=id_lower fromIndex=dev_DAM_SAFO score=max}{!edismax qf="collectorExact1^150 collectorExact2^30 collectorExact3^20 collector1^20 collector2^15 collector3^10 collector4^5"}%1$s)',
            //'q': '&q={!join from=invnumber to=invnumber fromIndex=dev_TAGS_PIC score=max v=prev_q:"%1$s"}', //OR {!join to=invnumber from=id_lower fromIndex=dev_DAM_SAFO score=max}{!edismax qf="collectorExact1^150 collectorExact2^30 collectorExact3^20 collector1^20 collector2^15 collector3^10 collector4^5"}%1$s)',
            'q': "&q=(({!join from=invnumber to=invnumber fromIndex=dev_TAGS_PIC score=max}{!edismax qf=prev_q v='%1$s'} OR {!join to=invnumber from=id_lower fromIndex=dev_DAM_SAFO score=max}{!edismax qf='collectorExact1^150 collectorExact2^30 collectorExact3^20 collector1^20 collector2^15 collector3^10 collector4^5'}%1$s))",            
            'fq': 'value:[* TO *]',
            'fl': '*, score',
            'sort': 'score desc',            
            'start': 0,
            'rows': 20,
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
                case 'search':
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

module.exports = connector_pictures_DAM;