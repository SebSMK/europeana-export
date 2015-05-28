
var path = require('path'),
    logger = require("./logging"),
    fs = require('fs'),
    express = require('express'),
    Image = require('./image'),
    config = require('./config'),
    SegfaultHandler = require('segfault-handler'),
    url = require('url'),
    exec = require('child_process').exec,
    app = express();

logger.debug("Overriding 'Express' logger");
app.use(express.logger({format: 'dev', stream: logger.stream }));

SegfaultHandler.registerHandler();

//Function to download file using wget
var download_file_wget = function(file_url) {

    var file_name = url.parse(file_url).pathname.split('/').pop();
    var wget = 'wget -P ' + config.tempFilePath + ' ' + file_url;
    
    var child = exec(wget, function(err, stdout, stderr) {
        if (err) throw err;
        else console.log(file_name + ' downloaded to ' + config.tempFilePath);
    });
};

/**
 * GET image request
 * */
app.get('/*', (function(_this) {

    return function(req, res) {
        var filePath, 
            resourcePath, 
            mode = req.param('mode') || 'noresize',
            pic = req.param('pic'),
            width = req.param('width') || 0,
            height = req.param('height') || 0,
            scale = req.param('scale') || 100;
        
        /*check values for limits*/
        
        if(pic){
            
            /* This should be removed as soon as possible - it's nothing to do with Corpus
             * but is a generic resizing functionality for any file which can be accessed
             * over http. It's used by the SMK webpage search.
             * */
            if(url.parse(pic)){
                filePath = download_file_wget();
                logger.info("pic resourcePath :", resourcePath);
            }else{
                /* For backwards compatability with the old cspic server api, the path can be
                 * set as an argument, like this:
                 * http://localhost:4000/?pic=globus/CORPUS%202015/KMS6111.jpg&mode=width&width=300
                 */
                resourcePath = decodeURIComponent(pic);
                logger.info("pic resourcePath :", resourcePath);
                filePath = path.join(config.root, resourcePath);
            }
        }else{
            /* We now support this form of request for the resource as well:
             * http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=width&width=300
             */
            resourcePath = decodeURIComponent(req.path)
            logger.info("resourcePath :", resourcePath);
            filePath = path.join(config.root, resourcePath);
        }
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
})(this));

logger.info("Serving images from " + config.root + " on port " + config.port);

/*app.listen() is a convenience method for creating the server*/
app.listen(config.port);

