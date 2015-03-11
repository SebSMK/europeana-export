
var imagemagick = require('imagemagick-native'),
    logger = require('./logging'),
    fs = require('fs'),
    exiv = require('./public/lib/exiv2/exiv2'),
    Solr = require('./solr'),
    config = require('./config');

/*http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript*/
function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
}

Image = (function() {
    
    var solr = new Solr(config.solrHost, config.solrPort);
    
    /**
     * Constructor
     **/
    function Image(path, width, height, scale, mode) {
        
          /*if no valid mode then fail*/
        if(mode !== 'width' && mode !== 'height' && mode !== 'scale' && mode !== 'noresize'){
            throw new Error('The mode must be \'width\', \'height\' or \'scale\'');
        }
        this.path = path;
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.mode = mode;
    }

    /**
     * Instance Methods 
     **/
    Image.prototype.resize = function(data) {

        var dpi = 72, cm, inches,
            width = 0,
            height = 0;

        logger.info('mode :', this.mode);

        if(this.mode === 'scale'){
            cm = this.width / this.scale;
            inches = cm * 0.39370;
            width = inches * dpi;
            logger.info('scale :', this.scale);
            logger.info('inches :', inches, 'inches');
            logger.info('original width :', this.width, 'cm');
            logger.info('scaled width :', cm + ' cm (' + width + ' px)');
        }else if (this.mode === 'width'){
            width = this.width;
            logger.info('width :', this.width, 'px');
        }else if (this.mode === 'height'){
            height = this.height;
            logger.info('height :', this.height, 'px');
        }else /*if (this.mode === 'noresize')*/{
            return data;
        }
        return imagemagick.convert({
            srcData: data,
            width: width,
            height: height,
            quality: 100,
            density: dpi,
            resizeStyle: 'aspectfit',
            format: 'JPEG'
        });
    };

    Image.prototype.process = function(done) {

        var image = config.tempFilePath + guid() + '.jpg';
        
        return fs.readFile(this.path, (function(_this) {
            return function(err, data) {
    
                logger.info('processJPG :', image);
                fs.writeFileSync(image, data);
                logger.info('file copied');
        
                return (function(_this) {
                    exiv.getImageTags(image, function(err, tags) {
                        logger.info('ObjectName: ' + tags['Iptc.Application2.ObjectName']);
                        //logger.info('tags : ' + JSON.stringify(tags, null, 4));
                        /*
                         * Default creator is "SMK Photo/Skou-Hansen/Buccarella".
                         * If we want a creator other than this, we need to know what
                         * to look for in the metadata to trigger another text.
                         * Those rules should be here.
                         * */
                        var inventoryNum = tags[config.smkInventoryNumber],
                            copyrightText = config.copyrightDefault,
                            webStatement = config.webStatementNoRights,
                            description = '',
                            newTags = [];
                            
                        logger.info('attempt get');
        
                        var solrPath = config.solrCore + '?q=id%3A' + inventoryNum + 
                                      '+&fl=id%2C+title_first%2C+copyright&wt=json&indent=true';
        
                        solr.get(solrPath)
                        .then( function(solrResponse){
                            var artwork = solrResponse.response.docs[0];
                            logger.info('artwork received : ' + artwork.toString());
                            if(artwork.copyright){
                                copyrightText = artwork.copyright;
                                webStatement = config.webStatementRights;
                            }
                            description = artwork.title_first;
                            /* Notes:
                             * 
                             * IPTC XMP metadata should be encoded in UTF-8
                             * IPTC metadata can use several encodings (provided by CodedCharacterSet)
                             * EXIF metadata should be encoded in ASCII. The characters "©, æ, å and ø" 
                             *   do not exist in ASCII  (but exist in some other 8bit encodings)
                             * Javascript strings are UCS2 2 byte unicode
                             * 
                             * Photoshop writes UTF-8 everywhere (wrong for EXIF), and we're going to do 
                             * the same.
                             * 
                             * Exiv2 (exiv2node is used here)
                             *   allows writing UTF-8 to EXIF (wrong, but good for us)
                             *   won't write UTF-8 to XMP (but I've made a fix for this)
                             * 
                             * */
                            newTags = {
                                /*EXIF*/
                                'Exif.Image.Artist' : config.attribution,
                                'Exif.Image.Copyright' : copyrightText,
                                'Exif.Image.ImageDescription' : description, 
                                /*IPTC*/
                                'Iptc.Application2.RecordVersion' : '4',/*2 bytes*/
                                'Iptc.Application2.Headline' : inventoryNum, /*256 bytes*/
                                'Iptc.Application2.City' : config.city, /*32 bytes*/
                                'Iptc.Application2.CountryName' : config.country, /*64 bytes*/
                                'Iptc.Application2.Byline' : config.attribution, /*32 bytes*/
                                'Iptc.Application2.BylineTitle' : config.photo, /*32 bytes*/
                                'Iptc.Application2.Credit' : config.smk, /*32 bytes*/
                                'Iptc.Application2.ObjectName' : inventoryNum, /*64 bytes*/
                                'Iptc.Application2.Copyright' : copyrightText, /*128 bytes*/
                                'Iptc.Application2.Caption' : description, /*2000 bytes*/
                                /*XMP*/
                                'Xmp.dc.format' : 'image/jpeg',
                                'Xmp.dc.title' : inventoryNum,
                                'Xmp.dc.description' : description,
                                'Xmp.dc.creator' : config.attribution,
                                'Xmp.dc.rights' : copyrightText,
                                'Xmp.xmpRights.Marked' : 'True', 
                                'Xmp.xmpRights.WebStatement' : webStatement
                            }
                            logger.info('tags : ' + JSON.stringify(newTags, null, 4));
        
                            /* Delete ALL existing metadata */
                            exiv.deleteImageTags(image, Object.keys(tags), function(err) {
                                /* Add new metadata */
                                /*TODO: handle this!*/
                                logger.info('deleted tags');
        
                                exiv.setImageTags(image, newTags, function(err){
                                    /*TODO: handle this!*/
                                    logger.info('set tags');
                                    data = fs.readFileSync(image);
                                    logger.info('read', image, 'to data');
                                    fs.unlink(image, function(err){
                                        logger.info(image, 'deleted');
                                    })
                                    return done(_this.resize(data));
                                });
                            });
                        }, function (err) {
                            /*TODO: test this!*/
                            logger.error('failed to fetch artwork: ' + err);
                            return done('', '');
                        });
                    });
                })(_this);
            };
        })(this));
    };
    return Image;
})();

module.exports = Image;
