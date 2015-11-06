var imagemagick = require('imagemagick-native'),
    logger = require('./logging'),
    fs = require('fs'),
    exiv = require('./public/lib/exiv2/exiv2'),
    Solr = require('./solr'),
    exec = require('child_process').exec,
    sprintf = require('sprintf-js').sprintf,
    Q = require('q'),
    config = require('./config'),
    mmm = require('mmmagic'),
    Magic = mmm.Magic,
    addMetadata = Q.denodeify(exiv.setImageTags),
    openMetadata = Q.denodeify(exiv.getImageTags),
    deleteFile = Q.denodeify(fs.unlink),
    writeFile = Q.denodeify(fs.writeFile),
    readFile = Q.denodeify(fs.readFile);
getFileStat = Q.denodeify(fs.stat);

Image = (function() {

    var solr = new Solr(config.solrHost, config.solrPort);
    var magic = new Magic(mmm.MAGIC_MIME_TYPE);
    var type, path, solrid;

    /**
     * Constructor
     **/
    function Image(path, solrid) {
        this.path = path;
        this.solrid = solrid;
    }

    /**
     * Instance Methods 
     **/
    Image.prototype.convert = function() {

        var dpi = 72,
            cm, inches,
            width = 0,
            height = 0
            //            type = (this.type == 'image/jpeg') ? 'jpeg' : '';
        type = (this.type == 'image/tif') ? 'tif' : '';
        //            type = this.type.replace('image/', '');

        logger.info('Image.prototype.convert:', this.mode);

        var convertedfile;

        try {
            convertedfile = imagemagick.convert({
                srcData: this.imageData,
                density: dpi,
                //                format: type,
                strip: true,
                ignoreWarnings: 1
            });
            logger.error('Image.prototype.convert success: ');
        } catch (e) {
            logger.error('Image.prototype.convert FAILED: ' + e);
        } finally {
            return convertedfile;
        }

        /*
        return imagemagick.convert({
            srcData: this.imageData,
            width: width,
            height: height,
            quality: 100,
            density: dpi,
            resizeStyle: 'aspectfit',
            format: type,
            strip: true
        });*/
    };

    Image.prototype.dummyprocess = function(done, error) {
        setTimeout(function() {
            return done('dummypath', 'image/tif');
        }, 500);
    }

    Image.prototype.process = function(done, error) {

        var self = this;
        //self.image = config.tempFilePath + guid() + '.image';
        self.image = config.tempFilePath + self.solrid + '.image';

        logger.info('Image.prototype.process: ' + JSON.stringify(this, null, 4));

        getFileStat(self.path)
            .then(function(stat) {
                if (stat.size > config.maxFileSize)
                    throw (sprintf("file %s too large: %s Ko", self.path, stat.size))
                else
                    return Q.defer().resolve();
            })
            .then(function() {
                logger.info('size is ok, start reading file', self.path);
                return readFile(self.path);
            })
            .then(function(data) {
                logger.info('read image file', self.path);
                self.imageData = data;
                return detectFile(self.path);
            })
            .then(function(type) {
                logger.info('detected file type :', type);
                self.type = type;
                return writeFile(self.image, self.imageData);
            })
            .then(function() {
                logger.info('created temp copy', self.image, "(" + self.path + ")");
                return openMetadata(self.image);
            })
            .then(function(tags) {
                logger.info('opened metadata', self.path);
                return lookupArtwork(tags, self.type);
            })
            .then(function(newTags) {
                logger.info('finished new tags');
                logger.debug('newTags:', JSON.stringify(newTags, null, 4));
                self.imageTags = newTags;
                self.imageData = self.convert();
                return writeFile(self.image, self.imageData);
            })
            .then(function() {
                logger.info('file conversion completed', self.image, "(" + self.path + ")");
                if (self.imageTags) {
                    return addMetadata(self.image, self.imageTags);
                }
                return Q.defer().resolve(); /*just hit next then*/
            })

        /*create pyr file*/
        .then(function() {
                if (self.imageTags) {
                    logger.info('added new metadata', self.image, "(" + self.path + ")");
                }
                return readFile(self.image);
            })
            .then(function(data) {
                self.pyr_path = config.tempFilePath + self.imageTags['Iptc.Application2.Headline'] + '_' + self.solrid + '_pyr.tif';
                return writeFile(self.pyr_path + '.tmp', data);
            })
            .then(function() {
                logger.info('create tmp pyr tiff');
                return convertPyr(self.pyr_path);
            })
            .then(function(type) {
                logger.info('create pyr tiff');
                return deleteFile(self.pyr_path + '.tmp').then(function() {
                    logger.info('deleted temp pyr copy', self.pyr_path + '.tmp',
                        "(" + self.path + ")")
                });
            })
            /*return pyr file path*/
            .then(function() {
                logger.info('delete tmp pyr tiff');
                deleteFile(self.image).then(function() {
                    logger.info('deleted temp copy', self.image,
                        "(" + self.path + ")")
                });
                return done(self.pyr_path, 'image/tif');

            })


        /*return pyr file*/
        /*
        .then(function() { 
            logger.info('delete tmp pyr tiff');            
            return readFile(self.pyr_path); 
            })        
        .then(function(data) { 
            logger.info('read updated data from file', self.pyr_path, "(" + self.path + ")");
            self.imageData = data;
            deleteFile(self.image).then(function(){logger.info('deleted temp copy', self.image, 
                                                   "(" + self.path + ")")}); 
            //return done(self.imageData, self.type);
            return done(self.imageData, 'image/tif');
            
            })
            */
        .catch(function(err) {
            /*catch and break on all errors or exceptions on all the above methods*/
            logger.error('Image.prototype.process', err);
            return error(err);
        })
    }

    Image.prototype.download = function(done, error) {

        var self = this;        

        logger.info('Image.prototype.download: ' + JSON.stringify(this, null, 4));
        
        readFile(self.path)
            .then(function(data) {
                logger.info('read image file', self.path);
                self.imageData = data;
                return detectFile(self.path);
            })
            .then(function(type) {
                logger.info('detected file type :', type);
                self.type = type;
                return Q.defer().resolve();                
            })            
            .then(function() {
                logger.info('send image data back', self.path);                                
                return done(self.imageData, self.type);                
            })
            .catch(function(err) {
                // catch and break on all errors or exceptions on all the above methods
                logger.error('Image.prototype.download', err);
                return error(err);
            })
    }

    /**
     * Private methods 
     **/

    function testSize(path) {
        var stats = fs.statSync(path);
        var fileSizeInBytes = stats["size"];
    }


    function convertPyr(path) {
        var self = this;
        var deferred = Q.defer();
        var source = path + '.tmp';
        var target = path;
        var cmd = sprintf("convert '%s' -define tiff:tile-geometry=256x256 -compress jpeg 'ptif:%s'", source, target)

        logger.info(cmd);

        var child = exec(cmd,
            function(error, stdout, stderr) {
                if (error !== null && error !== '') {
                    logger.error('exec error: ' + error);
                    //deferred.reject(error);
                } else {
                    logger.info('convertPyr Ok');
                    //deferred.resolve('0');  
                }
                deferred.resolve('0');
            });

        return deferred.promise;
    }


    function detectFile(path) {

        var deferred = Q.defer();

        magic.detectFile(path, function(err, result) {
            if (err) {
                logger.error('lookup mime type FAILED');
                deferred.reject(err);
            } else {
                deferred.resolve(result);
            }
        });
        return deferred.promise;
    }

    /* The string received from solr for describing artists needs some work in order
     * to generate a readable text for the description*/
    function parseArtist(artist) {

        var artistTxt = '',
            artists_split, values, name, role, birth, death,
            len = 0;
        split_1_niv = ";-;",
            split_2_niv = ";--;";

        if (!artist) {
            return '';
        }

        artists_split = artist.split(split_1_niv);
        len = artists_split.length;

        for (var i = 0; i < len; i++) {
            values = artists_split[i].split(split_2_niv);
            role = values[1];
            name = values[2];
            birth = values[3]; /*year only*/
            death = values[6]; /*year only*/

            if (i > 0) {
                artistTxt += '; '; /*separates artists*/
            }
            /* A bit of a grey area, but this is how we decide what a 'proper' artist is*/
            if (role !== 'trykker' && role !== 'udgiver' && role !== 'forfatter/redaktør') {
                artistTxt += name + ' (' + birth + '-' + death + ')';
            }
        }
        return artistTxt;
    };

    function lookupArtwork(tags, type) {

        var deferred = Q.defer(),
            copyrightText = config.copyrightDefault,
            webStatement = config.webStatementNoRights,
            inventoryNum = '',
            originalCopyright = '',
            attributionText = '',
            encodedInventoryNum = '',
            description = '',
            newTags = [],
            solrPath = '';

        if (type !== 'image/jpeg') {
            logger.info('lookupArtwork: type is not image/jpeg, but not returning');
            //return deferred.resolve();
        }

        try {
            inventoryNum = tags[config.smkInventoryNumber];
            encodedInventoryNum = encodeURI(inventoryNum);
            /* Solr should look in 'id' and 'other number'. For example: 
             * KMS8715 image uses DEP369 which is its 'other number' */
            solrPath = config.solrCore + '?q=(id%3A%22' + encodedInventoryNum +
                '%22)+OR+(other_numbers_andet_inventar%3A%22' + encodedInventoryNum +
                '%22)&fl=id%2C+title_first%2C+copyright%2C+producents_data%2C+object_production_date_eng&wt=json&indent=true';

        } catch (ex) {
            logger.error('lookup inventoryNum FAILED');
            return deferred.resolve();
            //return deferred.reject(ex);
        }

        /* Special case for older images which should have a different
         * attribution text*/
        try {
            originalCopyright = tags[config.originalCopyright];
        } catch (ex) {
            logger.error('originalCopyright field not present');
        }
        if (originalCopyright === config.oldAttribution) {
            attributionText = config.oldAttribution;
        } else {
            attributionText = config.attribution;
        }

        logger.info('lookupArtwork', solrPath);

        solr.get(solrPath)
            .then(function(solrResponse) {
                var artwork = solrResponse.response.docs[0];
                if (artwork.copyright) {
                    copyrightText = convertDanishChars(artwork.copyright);
                    webStatement = config.webStatementRights;
                }
                if (artwork.producents_data) {
                    description = convertDanishChars(parseArtist(artwork.producents_data)) + ', ';
                }
                description += convertDanishChars(artwork.title_first);
                if (artwork.object_production_date_eng) {
                    description += ', ' + artwork.object_production_date_eng;
                }
                /*
                 * XMP metadata should be encoded in UTF-8
                 * IPTC metadata can use several encodings (provided by CodedCharacterSet)
                 * EXIF metadata should be encoded in ASCII. The characters "©, æ, å and ø" 
                 *      do not exist in ASCII (but do exist in some other 8bit encodings
                 *      which some windows clients are using)
                 * 
                 * Photoshop writes UTF-8 everywhere (wrong for EXIF), and we're going to do 
                 * the same. Javascript strings are UCS2 2 byte unicode. There's some 
                 * image viewing software that won't show these characters properly if they follow the 
                 * specification exactly, but we accept that as there's other software which will
                 * show it incorrectly if we do.
                 * 
                 * Exiv2node module has bug where it won't write UTF-8 to XMP. I've made a fix for
                 * this which is why we're using a local version of exiv2node and not that in npm. I've
                 * made a pull request to the maintainer so it should be available at some point in
                 * the official release.
                 */
                newTags = {
                    /*EXIF*/
                    'Exif.Image.Artist': attributionText,
                    'Exif.Image.Copyright': copyrightText,
                    'Exif.Image.ImageDescription': description,
                    /*IPTC*/
                    'Iptc.Application2.RecordVersion': '4',
                    /*2 bytes*/
                    'Iptc.Application2.Headline': inventoryNum,
                    /*256 bytes*/
                    'Iptc.Application2.City': config.city,
                    /*32 bytes*/
                    'Iptc.Application2.CountryName': config.country,
                    /*64 bytes*/
                    'Iptc.Application2.Byline': attributionText,
                    /*32 bytes*/
                    'Iptc.Application2.BylineTitle': config.photo,
                    /*32 bytes*/
                    'Iptc.Application2.Credit': config.smk,
                    /*32 bytes*/
                    'Iptc.Application2.ObjectName': inventoryNum,
                    /*64 bytes*/
                    'Iptc.Application2.Copyright': copyrightText,
                    /*128 bytes*/
                    'Iptc.Application2.Caption': description,
                    /*2000 bytes*/
                    /*XMP*/
                    'Xmp.dc.format': 'image/jpeg',
                    'Xmp.dc.title': inventoryNum,
                    'Xmp.dc.description': description,
                    'Xmp.dc.creator': attributionText,
                    'Xmp.dc.rights': copyrightText,
                    'Xmp.xmpRights.Marked': 'True',
                    'Xmp.xmpRights.WebStatement': webStatement
                }
                deferred.resolve(newTags);
            })
            .catch(function(error) {
                logger.error('lookupArtwork', error);
                deferred.reject(error);
            });

        return deferred.promise;
    }
    return Image;
})();

/**
 * Helper functions
 **/

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function convertDanishChars(string) {
    string = string.replace(/©/g, "Copyright");
    string = string.replace(/Æ/g, "Ae");
    string = string.replace(/Ø/g, "Oe");
    string = string.replace(/Å/g, "Aa");
    string = string.replace(/æ/g, "ae");
    string = string.replace(/ø/g, "oe");
    string = string.replace(/å/g, "aa");
    return string;
}

module.exports = Image;