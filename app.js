
var path = require('path'),
    logger = require("./logging"),
    fs = require('fs'),
    express = require('express'),
    Image = require('./image'),
    MongoDB = require('./mongo'),
    config = require('./config'),
    SegfaultHandler = require('segfault-handler'), 
    Solr = require('./solr'),       
    sprintf = require('sprintf-js').sprintf,  
    Q = require('q'),   
    app = express();

var version = '000.001.001';

logger.debug("Overriding 'Express' logger");
app.use(express.logger({format: 'dev', stream: logger.stream }));
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

SegfaultHandler.registerHandler();

// get the image with the given id in SOLR_DAM
app.get('/imssrv/:id', function(req, res){     
    var solrPath = sprintf('%sselect?q=(id%%3A%s)&wt=json&fl=value', config.solrDAMCore, req.params.id); //'561e19ebe44bc'); 
              
   // Create a client 
   var solr = new Solr(config.solrDAMHost, config.solrDAMPort); //, config.solrDAMCore);    
    
    solr.get(solrPath)
        .then( function(solrResponse){
           var artwork = solrResponse.response.docs[0]; 
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
app.post('/convert_pyr', function(req, res) {
        var params = req.body;
        var jsonposted = Object.keys(params).length > 0 ? params : [{"id":"561e19ebe67e3", "invnumber":"kms3123", "link":"Diverse arbejdsmateriale til udstillinger- IKKE DOK FOTO/udstillinger/tidslinie/er printet/KMS3123.tif"}];
        var filePath, 
            resourcePath,
            solrid; 
                   
        /*check values for limits*/        
        resourcePath = jsonposted[0].link;            
        logger.info("resourcePath :", resourcePath);

        solrid = jsonposted[0].id;            
        logger.info("solrid :", solrid);

        filePath = path.join(config.root, resourcePath);
        logger.info("filePath name :", filePath);
        
        return fs.exists(filePath, function(exists) {
            var image;
            if (!exists) {
                return res.send(404);
            }
            try{
                image = new Image(filePath, solrid);
            }
            catch(ex){
                logger.error(ex);
                return res.send(400);
            }
            return image.process(
                function(pyrfilepath, type) {                                                        
                    return res.send(pyrfilepath);
                },
                function(error) {
                    return res.status(500).send({error: error});
                }
             );
        });
    });


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

