
var path = require('path'),
    logger = require("./logging"),
    fs = require('fs'),
    express = require('express'),
    Image = require('./image'),
    MongoDB = require('./mongo'),
    config = require('./config'),
    SegfaultHandler = require('segfault-handler'), 
    Solr = require('./solr'),
    Q = require('q'),   
    app = express();

var version = '.009';

logger.debug("Overriding 'Express' logger");
app.use(express.logger({format: 'dev', stream: logger.stream }));
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

SegfaultHandler.registerHandler();

app.post('/mongoadd', function(req, res){
    // Connect to mongo (url to mongo is in config.js)    
    var mongodb = new MongoDB();    
    var params = req.body;
    var doc = Object.keys(params).length > 0 ? params : [{a : 1}, {a : 2}, {a : 3}];            
    var query = {};
    var collection = 'collection';    
    
    var display = mongodb.insertDocuments(doc, collection)
    .then(function(data) {
        return mongodb.findDocuments(query, collection);        
    })
    .then(function(data){
        res.send(version + '<br>Result: <br>' + data);
    })
    .catch(function (err) {
        /*catch and break on all errors or exceptions on all the above methods*/
        logger.error('Mongo route', err);
        res.send(version + '<br>Result: <br>' + err);
    });     
});

app.post('/mongodel', function(req, res){
    // Connect to mongo (url to mongo is in config.js)    
    var mongodb = new MongoDB();        
    var params = req.body;
    var query = Object.keys(params).length > 0 ? params : {a : 1};
    var collection = 'collection';    
    
    var display = mongodb.removeDocuments(query, collection)
    .then(function(data){
        res.send(version + '<br>Result: <br>' + data);
    })
    .catch(function (err) {
        /*catch and break on all errors or exceptions on all the above methods*/
        logger.error('Mongo reset route', err);
        res.send(version + '<br>Result: <br>' + err);
    });     
});


app.post('/solrdamedit', function(req, res){
    var solr = new Solr(config.solrDAMHost, config.solrDAMPort, config.solrDAMCore);
    var params = req.body;
    var jsonposted = Object.keys(params).length > 0 ? params : [{"id":"561e19ebcd46a", "value":{"set":'test'}}];
    
    solr.postjson(jsonposted)
        .then( function(solrResponse){
           logger.info("solr post response :", solrResponse);
           res.send(solrResponse);
        }).catch(function (err) {
        /*catch and break on all errors or exceptions on all the above methods*/
        logger.error('solr route', err);
        res.send(version + '<br>Solr error: <br>' + err);
    }); 
    
});

/**
 * GET image request
 * */
app.get('/convert/*', (function(_this) {      
  
    var processed_image_stream = function(req, res) {
        var filePath, 
            resourcePath, 
            mode = req.param('mode') || 'noresize',
            pic = req.param('pic'),
            width = req.param('width') || 0,
            height = req.param('height') || 0,
            scale = req.param('scale') || 100;
        
        /*check values for limits*/
        
        if(pic){
            /* For backwards compatability with the old cspic server api, the path can be
             * set as an argument, like this:
             * http://localhost:4000/?pic=globus/CORPUS%202015/KMS6111.jpg&mode=width&width=300
             */
            resourcePath = decodeURIComponent(pic);
            logger.info("pic resourcePath :", resourcePath);
        }else{
            /* We now support this form of request for the resource as well:
             * http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=width&width=300
             */
            resourcePath = decodeURIComponent(req.params[0]);            
            logger.info("resourcePath :", resourcePath);
        }
        filePath = path.join(config.root, resourcePath);
        logger.info("filePath name :", filePath);
        
        return fs.exists(filePath, function(exists) {
            var image;
            if (!exists) {
                return res.send(404);
            }
            try{
                image = new Image(filePath, width, height, scale, mode);
            }
            catch(ex){
                logger.error(ex);
                return res.send(400);
            }
            return image.process(function(data, type) {                                    
                res.set('Content-Type', type);
                return res.send(data);
            },
            function(error) {
                return res.status(500).send({error: error});
            });
        });
    };
    
    
    
    return processed_image_stream;
})(this));

logger.info("Serving images from " + config.root + " on port " + config.port);

/*app.listen() is a convenience method for creating the server*/
app.listen(config.port);

