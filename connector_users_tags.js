var Q = require('q'),
    solr = require('solr-client'),
    sprintf = require('sprintf-js').sprintf;

var connector_users_tags = {

    config: {
        id: 'users_tags',
        connector: connector_users_tags,
         host: 'csdev-seb-02',
        port: 8983,
        path: '/solr/dev_TAGS_PIC',
        def_query: {
            'q': '*:*',
            'fq': '{!join from=invnumber to=invnumber}prev_q:"%1$s" OR invnumber:%1$s',
            'facet': true,
            'facet.field': ['prev_q'],
            'facet.sort': 'count',
            'facet.mincount': 1,
            'facet.limit': 40,
            'rows': '0',
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
            query['fq'] = sprintf(query['fq'], params.toString());
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

module.exports = connector_users_tags;