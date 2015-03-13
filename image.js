
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

function convertDanishChars(string){ 
    string = string.replace( /©/g, "Copyright" );
    string = string.replace( /Æ/g, "Ae" ); 
    string = string.replace( /Ø/g, "Oe" ); 
    string = string.replace( /Å/g, "Aa" );
    string = string.replace( /æ/g, "ae" ); 
    string = string.replace( /ø/g, "oe" ); 
    string = string.replace( /å/g, "aa" );
    return string; 
}

Image = (function() {
    
    var solr = new Solr(config.solrHost, config.solrPort);

    /**
     * Constructor
     **/
    function Image(path, width, height, scale, mode) {

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
    Image.prototype.convert = function(data) {

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
            return imagemagick.convert({
                srcData: data,
                density: dpi,
                strip: true
            });
        }
        return imagemagick.convert({
            srcData: data,
            width: width,
            height: height,
            quality: 100,
            density: dpi,
            resizeStyle: 'aspectfit',
            format: 'JPEG',
            strip: true
        });
    };

    Image.prototype.process = function(done) {

        var image = config.tempFilePath + guid() + '.jpg';
        
        return fs.readFile(this.path, (function(_this) {
            return function(err, data) {

                logger.info('processJPG :', _this.path, image);
                fs.writeFileSync(image, data);
                logger.info('file copied');
        
                return (function(_this) {
                    exiv.getImageTags(image, function(err, tags) {

                        logger.info('ObjectName: (' + _this.path + ')' + tags['Iptc.Application2.ObjectName']);

                        var inventoryNum = tags[config.smkInventoryNumber],
                            encodedInventoryNum = encodeURI(inventoryNum),
                            copyrightText = config.copyrightDefault,
                            webStatement = config.webStatementNoRights,
                            description = '',
                            newTags = [],
                            /* Solr should look in 'id' and 'other number'. For example: KMS8715 image
                             * uses DEP369 which is its 'other number'*/
                            solrPath = config.solrCore + '?q=(id%3A%22' + encodedInventoryNum + 
                                      '%22)+OR+(other_numbers_andet_inventar%3A%22' +  encodedInventoryNum +
                                      '%22)&fl=id%2C+title_first%2C+copyright&wt=json&indent=true';

                        logger.info('attempt solr.get on', solrPath);
                        solr.get(solrPath)
                        .then( function(solrResponse){
                            var artwork = solrResponse.response.docs[0];
                            logger.info('artwork received : ' + artwork.toString());
                            if(artwork.copyright){
                                copyrightText = convertDanishChars(artwork.copyright);
                                webStatement = config.webStatementRights;
                            }
                            description = convertDanishChars(artwork.title_first);
                            /* XMP metadata should be encoded in UTF-8
                             * IPTC metadata can use several encodings (provided by CodedCharacterSet)
                             * EXIF metadata should be encoded in ASCII. The characters "©, æ, å and ø" 
                             *      do not exist in ASCII (but do exist in some other 8bit encodings
                             *      which some windows clients are using)
                             * (Javascript strings are UCS2 2 byte unicode)
                             * 
                             * Photoshop writes UTF-8 everywhere (wrong for EXIF), and we're going to do 
                             * the same. There's probably some image programs that won't show these characters
                             * properly if they follow the specification exactly, but we accept that.
                             * 
                             * Exiv2node won't write UTF-8 to XMP. I've made a fix for this which is
                             * why we're using a local version of exiv2node and not that in npm. I've
                             * made a pull request to the maintainer so it should be available at some point.
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

                            /* Resize and strip metadata. Don't use exiv2 to strip because
                             * it segfaults when it gets busy*/
                            fs.writeFileSync(image, _this.convert(data));
                            logger.info('convert finished');

                            exiv.setImageTags(image, newTags, function(err){
                                logger.info('setImageTags', image);
                                if(err){
                                    logger.error('setImageTags FAILED:', image);
                                    return done('', '');
                                }
                                data = fs.readFileSync(image);
                                fs.unlink(image, function(err){
                                    if(err){
                                        logger.error('fs.unlink FAILED:', image);
                                    }else{
                                        logger.info('Deleted', image);
                                    }
                                })
                                return done(data);
                            });
                        }, function (err) {
                            logger.error('fetch artwork details FAILED:', err);
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
