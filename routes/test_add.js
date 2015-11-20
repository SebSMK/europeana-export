var express = require('express'),
    //router = express(),
    path = require('path'),
    logger = require("../logging"),
    config = require('../config'),
    util = require('../util'),
    converter = require('../converter'),
    Solr = require('../solr'),
    iipproxy = require('../iip'),
    sprintf = require('sprintf-js').sprintf,
    Q = require('q'),
    fs = require('fs'),
    Image = require('../image'),
    upath = require('upath'),
    request = require('request'),
    getFileStat = Q.denodeify(fs.stat);

module.exports = function(router, io) {
    router.set('views', path.join(__dirname, '../views'));
    router.set('view engine', 'jade');

    /*******************************
     ********  CONSOLE  ***********   
     *******************************/
    router.get('/imgsrv/test/console',
        // loading interface and socket IO before proceeding with
        function(req, res, next) {
            res.render('chat');
            io.on('connection', function(socket) {
                console.log('io connected');
                next();
            });
        },
        function(req, res, next) {
            io.sockets.emit('message', {
                message: 'welcome to import console ' + config.version
            });
        });


    /*******************************
     ********  ADD ALL  ***********  
     *
     * As of today:
     * - size limited to config.maxFileSize
     *******************************/
    router.get('/imgsrv/test/add/all',
        function(req, res, next) {
            io.sockets.emit('message', {
                message: 'welcome to import console ' + config.version
            });
            io.sockets.emit('message', {
                message: 'starting importing all images to proto-DAM' + config.version
            });
            
            next();
        },
        // ...real stuff starting here
        function(req, res, next) {

            sendInterfaceMessage('//////// start processing all images');
            
            var deferred = Q.defer();
            var solrPath = sprintf('%sselect?', config.solrDAMCore);                                   

            var solr = new Solr(config.solrDAMHost, config.solrDAMPort);
            solr.get2(solrPath, config.solrParamsImportAll)
                .then(function(solrResponse) {

                    var maxCount = 0;
                    var objectedItems = [];
                    for (var facet in solrResponse.facet_counts.facet_fields['invnumber']) {
                        logger.info("facet: " + facet);
                                                
                        if(!util.isValidDataText(facet))
                          continue;
                          
                        var count = parseInt(solrResponse.facet_counts.facet_fields['invnumber'][facet]);
                        if (count > maxCount) {
                            maxCount = count;
                        }
                        objectedItems.push({
                            facet: facet,
                            count: count
                        });
                    }
                    objectedItems.sort(function(a, b) {
                        return a.facet < b.facet ? -1 : 1;
                    });

                    // process images
                    if (objectedItems.length > 0) {
                        logger.info("addAll - solr says:", objectedItems.length);
                        sendInterfaceMessage("addAll - solr says:" + objectedItems.length);

                        var artwork2Process = [];
                        var reach_last_processed = util.isValidDataText(config.last_processed);
                        for (var i = 0, l = objectedItems.length; i < l; i++) {
                            
                            if(reach_last_processed){
                              if(objectedItems[i].facet == config.last_processed)
                                reach_last_processed = false;                              
                              continue;
                            }
                            
                            var pyrconv = new converter();
                            var params = {};
                            params.invnumber = objectedItems[i].facet;
                            artwork2Process.push(params);
                        };

                        var convimage = function(params) {
                            sendInterfaceMessage(sprintf('*** %s ----- start processing', params.invnumber.toUpperCase()));                            
                            return addById(params.invnumber)                            
                                    .then(
                                        // processing output
                                        function(tosend) {                                            
                                            for (var line in tosend) {
                                                sendInterfaceMessage(tosend[line]);
                                            }
                                            sendInterfaceMessage(sprintf(' %s ----- processing done ***', params.invnumber.toUpperCase()));
                                            return Q.defer().resolve();                                            
                                        },
                                        function(error) {
                                            sendInterfaceMessage('ERROR -- ' + JSON.stringify(error));
                                            sendInterfaceMessage(sprintf(' %s ----- processing done ***', params.invnumber.toUpperCase()));
                                            return Q.defer().resolve();
                                        })                                        
                        };

                        var processing = function(artworks) {
                            var p = Q();

                            artworks.forEach(function(artwork) {
                                p = p
                                .then(function() {
                                    return convimage(artwork);
                                }, function() {
                                    return convimage(artwork);
                                });
                            });
                            return p;
                        };


                        processing(artwork2Process)
                        .then(
                            function() {                                
                                sendInterfaceMessage('all images processed //////////');
                                res.end();
                            },
                            function(error) {
                                sendInterfaceMessage('GENERAL ERROR -- ' + JSON.stringify(error));
                                sendInterfaceMessage('when processing images //////////');
                                res.end();
                            });

                    } else {
                        logger.info("found no images to process: " + solrResponse);
                        deferred.reject("found no images to process: " + JSON.stringify(solrResponse));                        
                    }                   
                    
                    return deferred.promise;
                })
                .catch(function(err) {
                    logger.error('addAll - image processing stopped', err);                    
                    sendInterfaceMessage("addAll - FATAL ERROR: " + err);
                    sendInterfaceMessage("image processing stopped ////////");
                    deferred.reject(err);
                    return deferred.promise;
                })                
              
              res.end();
        });

    /*******************************
     ********  ADD BY ID  ***********   
     *******************************/
    router.get('/imgsrv/test/add/:id',
        function(req, res, next) {
            io.sockets.emit('message', {
                message: 'welcome to import console ' + config.version
            });
            next();
        },
        // ...real stuff starting here
        function(req, res, next) {

            sendInterfaceMessage(sprintf('******* %s ----- start processing', req.params.id.toUpperCase()));

            addById(req.params.id)
                .then(
                    // processing output
                    function(tosend) {
                        sendInterfaceMessage('processing result: ' + req.params.id);
                        for (var line in tosend) {
                            sendInterfaceMessage(tosend[line]);
                        }
                        sendInterfaceMessage(sprintf('%s ----- processing done *******', req.params.id.toUpperCase()));
                        res.end();
                    },
                    function(error) {
                        sendInterfaceMessage('ERROR -- ' + JSON.stringify(error));
                        sendInterfaceMessage(sprintf('%s ----- processing done *******', req.params.id.toUpperCase()));
                    })
                    .done();
        }
    );



    /***
     *  PRIVATE FUNCTIONS
     **/

    function addById(id) {

        var promise = [];
        var deferred = Q.defer();

        var solrPath = sprintf('%sselect?', config.solrDAMCore);
        var solrParams = {            
            'q': sprintf('(id:%s OR invnumber:%s)', '"' + id + '"', '"' + id + '"'),            
            'wt': 'json',
            'indent': 'true',
            'json.nl': 'map',
            'fl': 'link,id,invnumber'
        };                       
            
        var solr = new Solr(config.solrDAMHost, config.solrDAMPort);
        solr.get2(solrPath, solrParams)
            .then(function(solrResponse) {

                // find artwork(s) in solrdam 
                if (solrResponse.response.numFound > 0) {
                    logger.info("addByID - solr says:", solrResponse);
                    sendInterfaceMessage("addByID - solr says, numfound:" + JSON.stringify(solrResponse.response.numFound));

                    // convert artwork(s)
                    for (i = 0; i < solrResponse.response.numFound; i++) {
                        var pyrconv = new converter();
                        var params = {},
                            doc = solrResponse.response.docs[i],
                            size, created;
                        params.id = doc.id;
                        params.link = pathConv2Unix(doc.link);
                        params.invnumber = doc.invnumber;

                        sendInterfaceMessage(sprintf("-- start processing - %s - %s %s", params.invnumber, params.id, params.link));

                        promise.push(processConversion(pyrconv, params));
                    };
                } else {
                    logger.info("addByID - image not found :" + id);
                    deferred.reject("addByID - image not found: " + id);                    
                }

                Q.allSettled(promise).then(function(result) {
                    //loop through array of promises, add items  
                    var tosend = []
                    result.forEach(function(res) {
                        if (res.state === "fulfilled") {
                            tosend.push("-- SUCCESS: " + res.value);
                        }
                        if (res.state === "rejected") {
                            tosend.push("-- ERROR: " + res.reason);
                        }
                    });
                    promise = []; //empty array, since it's global.
                    deferred.resolve(tosend);
                });
            })
            .catch(function(err) {
                logger.error('addByID- GENERAL ERROR', err);
                promise = [];
                deferred.reject(err);
            })
            .done();

        return deferred.promise;
    };

    function processConversion(pyrconv, params) {
        return getFileStat(params.link)
            .then(function(stat) {
                // get and check file size
                return checkFileSize(stat, params);
            })
            .then(function(stat) {

                sendInterfaceMessage('---- processConversion: ' + params.id);
                // start conversion
                return pyrconv.exec(params)
                    .then(function(res) {
                        // save conversion-data back to solr-dam
                        return sendDataBackToSolrDAM(params, res, stat);
                    })
            })
    }

    function sendDataBackToSolrDAM(params, res, stat) {
        var solr = new Solr(config.solrDAMHost, config.solrDAMPort, config.solrDAMCore);
        var reqparams = [{
            "id": params.id,
            "value": {
                "set": res.pyrpath
            },
            "size": {
                "set": stat.size
            },
            "created": {
                "set": stat.created
            },
            "field_last_updated": {
                "set": getSOLRFormatedNowDate()
            }
        }];
        var deferred = Q.defer();

        solr.postjson(reqparams)
            .then(function(solrResponse) {
                logger.info("send back to solrDAM:", {
                    invnumber: params.invnumber,
                    id: params.id
                });
                deferred.resolve(sprintf("send back to solrDAM: - %s - %s", params.invnumber, params.id));
            })
            .catch(function(err) {
                logger.error('send back to solrDAM:', err);
                deferred.reject('send back to solrDAM - error: ' + err);
            });

        return deferred.promise;

    }

    function checkFileSize(stat, params) {
        var deferred = Q.defer();
        // get and check file size
        if (stat.size > config.maxFileSize) {
            deferred.reject(sprintf("%s - file size over config.maxFileSize: %s Ko - %s", params.invnumber, stat.size, params.link));
        } else {
            size = stat.size;
            created = convertToSolrDate(stat.mtime);
            deferred.resolve({
                size: size,
                created: created
            });
        }

        return deferred.promise;
    };


    function pathConv2Unix(windowsPath) {
        var unixPath = upath.toUnix(windowsPath);
        return unixPath.replace('/foto-03/FotoI/', config.mnt.fotoI);
    };

    function sendInterfaceMessage(message) {
        io.sockets.emit('message', {
            message: sprintf('%s -- %s', getFormatedNowDate(), message)
        });
    };

    function getFormatedNowDate() {
        var date = new Date();
        var y = date.getFullYear();
        var M = date.getMonth();
        var d = date.getDate();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();
        var ms = date.getMilliseconds();


        return sprintf('%s-%s-%sT%s:%s:%s.%s', y, M, d, h, m, s, ms);
    };

    function getSOLRFormatedNowDate() {
        var date = new Date();
        var y = date.getFullYear();
        var M = date.getMonth();
        var d = date.getDate();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();
        var ms = date.getMilliseconds();


        return sprintf('%s-%s-%sT%s:%s:%sZ', y, M, d, h, m, s);
    };

    function convertToSolrDate(date) {
        var y = date.getFullYear();
        var M = date.getMonth();
        var d = date.getDate();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();
        var ms = date.getMilliseconds();


        return sprintf('%s-%s-%sT%s:%s:%sZ', y, M, d, h, m, s);
    };

}