#corpus-image-server

Node server to serve, convert and resize jpg images on demand

### Dependencies

For linux, it's recommended to create a user named *node* (the name isn't important - just not root) for running the server.

In Debian/Ubuntu, you will need to install some or all of these libraries. Login as *root* and 
install the following

    $ apt-get update
	$ apt-get install libmagick++-dev
	$ apt-get install libjpeg-dev  
	$ apt-get install exiv2
	$ apt-get install libexiv2-dev

Configuration can be found in the *config.js* file where the solr instance can be
configured, as well as the default texts for the image metadata.

#### Node.js
The application uses *nodejs* to create an http server. To install the latest stable version in Debian

	$ apt-get install curl
	$ curl -sL https://deb.nodesource.com/setup | bash -
	$ apt-get install -y nodejs
	
The remaining instructions don't require *root* so switch to the *node* (any non-root) user.

#### Package managers
Npm is required for managing the *node.js* libraries which aren't included in the source.

	$ sudo apt-get install npm

### Code repository
The project resides on github and requires *git*.

	$ sudo apt-get install git
	$ mkdir ~/git
	$ cd ~/git
	$ git clone  https://github.com/StatensMuseumforKunst/LocationHistory.git
	
### Run the application

	$ npm install
	$ node app.js

Logs will be written to *server.log* 

### API

#### Width mode

In width mode, *width* is the width in pixels of the requested image

	http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=width&width=200

#### Height mode

In height mode, *height* is the height in pixels of the requested image

	http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=height&height=200

#### Scale mode

In scale mode, *width* is the actual width in cm of the original artwork and *scale* is a positive integer.

	http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=scale&width=250&scale=50


