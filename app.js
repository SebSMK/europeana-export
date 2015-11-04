
var path = require('path'),
    logger = require("./logging"),
    fs = require('fs'),
    express = require('express'),
    Image = require('./image'),
    MongoDB = require('./mongo'),
    config = require('./config'),
    SegfaultHandler = require('segfault-handler'), 
    Solr = require('./solr'),
    iipproxy = require('./iip'),       
    sprintf = require('sprintf-js').sprintf,  
    Q = require('q'),   
    app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);


var route_imgsrv_add = require('./routes/imgsrv_add')(app, io);
var route_imgsrv_add_test = require('./routes/test_add')(app, io);
var route_imgsrv_get_test = require('./routes/test_zoom')(app, io);
var route_index = require('./routes/index');
var route_searching = require('./routes/searching');
var route_imgsrv = require('./routes/imgsrv');
var route_test = require('./routes/test');

var version = config.version;

logger.debug("Overriding 'Express' logger");
//app.options('*', cors()); // include before other routes
//app.use(cors());
app.use(express.logger({format: 'dev', stream: logger.stream }));
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies
//uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

SegfaultHandler.registerHandler();

/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});*/
app.use('/', route_index);
app.use('/', route_searching);
app.use('/', route_imgsrv);
app.use('/', route_test);

/**
 * convert image request
 * */
app.post('/convert_pyr', (function(_this) {          
    var processed_image_stream = function(req, res) {
        var params = req.body;
        var jsonposted = Object.keys(params).length > 0 ? params : [{"id":"561e19ec7fcca", "invnumber":"kms3123", "link":"Diverse arbejdsmateriale til udstillinger- IKKE DOK FOTO/udstillinger/tidslinie/er printet/KMS3123.tif"}];
        var filePath, 
            resourcePath, 
            solrid; 
           
        
        /*check values for limits*/        
        solrid = jsonposted[0].id;            
        logger.info("solrid :", solrid);
        
        resourcePath = jsonposted[0].link;            
        logger.info("resourcePath :", resourcePath);

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
            return image.process(function(data, type) {                                    
                
                var solr = new Solr(config.solrDAMHost, config.solrDAMPort, config.solrDAMCore);                
                var reqparams = [{"id":solrid, "value":{"set":data}}];
                
                solr.postjson(reqparams)
                    .then( function(solrResponse){
                       logger.info("solr dam response :", solrResponse);
                       return res.send(version + '<br>' + JSON.stringify(solrResponse));
                    }).catch(function (err) {
                    /*catch and break on all errors or exceptions on all the above methods*/
                    logger.error('solr dam', err);
                    return res.send(version + '<br>Solr dam error: <br>' + err);
                });                               
            },
            function(error) {
                return res.status(500).send({error: error});
            });
        });
    };

    return processed_image_stream;
})(this));


/***
 *  DEV - NOT IN PROD
 **/
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

logger.info("Serving images from " + config.root + " on port " + config.port);

/*app.listen() is a convenience method for creating the server*/
//app.listen(config.port);

/*
http.listen(80, function(){
  console.log('CORS-enabled web server listening on port 80');
});
*/

http.listen(config.port, function(){
  console.log('listening on *:' + config.port);
});


