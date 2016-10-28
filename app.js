
var path = require('path'),
    logger = require("./logging"),    
    express = require('express'),    
    config = require('./config'),
    SegfaultHandler = require('segfault-handler'), 
    app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);


var route_imgsrv_add = require('./routes/export')(app, io);

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


