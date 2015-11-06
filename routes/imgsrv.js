var express = require('express'),
    router = express(),
    path = require('path'),
    logger = require("../logging"),
    config = require('../config'),
    converter = require('../converter'),
    Solr = require('../solr'),
    iipproxy = require('../iip'),
    sprintf = require('sprintf-js').sprintf,
    Q = require('q'),
    fs = require('fs'),
    Image = require('../image'),
    upath = require('upath');

router.set('views', path.join(__dirname, '../views'));
router.set('view engine', 'jade');
//router.use(express.static(path.join(__dirname, '../private')));


/***
 *  GET IMAGE
 *  @id: can be an artwork reference number or an unique image id
 *  
 *  optional:
 *  @size: predefined size: thumb/medium/large/original (defaut: original)
 *  
 *  return:
 *  if size = thumb/medium/large -> return STREAM (image displayer in browser) of the formatted pyr image in jpg format
 *  if size = null || original -> return DATA (image downloaded in browser) of the original image in original format (can be tif, jpg etc...)
 **/
router.get('/imgsrv/get/:id', function(req, res, next) {
    var redir = sprintf('/imgsrv/get/%s/original', req.params.id);
    res.redirect(redir);
});

router.get('/imgsrv/get/:id/:size', function(req, res, next) {     
    var solrPath = sprintf('%sselect?', config.solrDAMCore);
    var solrParams = {
        'q': sprintf('(id%%3A%s+OR+invnumber%%3A%s)', '"' + req.params.id + '"', '"' + req.params.id + '"'),
        'sort': 'created+desc',
        'wt': 'json',
        'indent': 'true',
        'json.nl': 'map',
        'fl': 'link,value,id,type,invnumber'
    };
    var solrReq = [];

    for (var key in solrParams) {
        if (solrParams.hasOwnProperty(key)) {
            solrReq.push(sprintf('%s=%s', key, solrParams[key]));
        }
    }

    var imgsize = config.IIPImageSize[req.params.size];
    var solr = new Solr(config.solrDAMHost, config.solrDAMPort);

    solr.get(solrPath + solrReq.join('&'))
        .then(function(solrResponse) {
            if (solrResponse.response.numFound > 0) {
                logger.info("/imgsrv/get - solr says:", solrResponse);
                
                // we get only the last created image
                if(imgsize !== undefined){
                  // get pyr image
                  var pyrfilePath = solrResponse.response.docs[0].value;                                
                  var iip = new iipproxy(config.IIPHost, config.IIPPath, imgsize);                
                  return iip.getImageByFilePath(pyrfilePath)
                          .then(function(imgstream) {
                              imgstream.pipe(res); // RETURN STREAM (image diplayed in browser)
                          });
                }else{
                  // get original image
                  var originalFilePath = path.join(config.root, pathConv2Unix(solrResponse.response.docs[0].link));                  
                  var id = solrResponse.response.docs[0].id;
                  var imgtype = solrResponse.response.docs[0].type;
                  var invnumber = solrResponse.response.docs[0].invnumber;
                  
                  return fs.exists(originalFilePath, function(exists) {
                      var image;
                      if (!exists) {
                          return res.send(404);
                      }
                      try{
                          image = new Image(originalFilePath, id);
                      }
                      catch(ex){
                          logger.error(ex);
                          return res.send(400);
                      }
                      return image.download(function(data, type) {
                          res.set('Content-Type', type);
                          res.set('Content-Disposition', sprintf('filename=%s_%s%s', invnumber, id, imgtype));                          
                          return res.send(data); // RETURN DATA (image downloaded in browser)
                      },
                      function(error) {
                          return res.status(500).send({error: error});
                      });
                  });                                  
                }                                
            } else {
                logger.info("/imgsrv/get - image not found :", pyrfilePath);
                return res.status(404).send({
                    error: "/imgsrv/get - image not found : " + pyrfilePath
                });
            }
        })
        /*
        .then(function(imgstream) {
            imgstream.pipe(res);
        })*/
        .catch(function(err) {
            //catch and break on all errors or exceptions on all the above methods
            logger.error('/imgsrv/get', err);
            res.send(version + '<br>/imgsrv/get error: <br>' + err);
        });
});

/***
 *  CONVERT POSTED DATA TO PYR IMAGES
 *  @id: unique id for original image in Solr DAM
 *  @invnumber: inventar number of the image
 *  @link: link to original image
 *  
 **/

router.post('/imgsrv/add', function(req, res) {
    var params = req.body;
    var pyrconv = new converter();

    pyrconv.exec(params)
        .then(function(response) {
            return res.send(response);
        })
        .catch(function(err) {
            //catch and break on all errors or exceptions on all the above methods
            logger.error('/imgsrv/post', err);
            return res.status(500).send({
                error: err
            });
        });
});


/***
 *  PRIVATE FUNCTIONS
 **/

function pathConv2Unix(windowsPath) {
    var unixPath = upath.toUnix(windowsPath);
    return unixPath.replace('F:/FotoII/', '');
};

module.exports = router;