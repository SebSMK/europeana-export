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
        def_query: {
            'q': '%s',
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
        if (use_def_query) {
            query = JSON.parse(JSON.stringify(this.config.def_query)); // cloning JSON 
            query['q'] = sprintf(query['q'], params.toString());
        } else {
            query = params;
        }

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