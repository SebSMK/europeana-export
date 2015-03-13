#corpus-image-server

Node server to serve, convert and resize jpg images on demand

## Dependencies

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
	
The remaining instructions don't require *root* so switch to the *node* (or any non-root) user.

#### Package managers
Npm is required for managing the *node.js* libraries which aren't included in the source.

	$ sudo apt-get install npm

### Code repository
The project resides on github and requires *git*.

	$ sudo apt-get install git
	$ mkdir ~/git
	$ cd ~/git
	$ git clone  https://github.com/StatensMuseumforKunst/corpus-image-server.git
	
### Install the required node libraries

	$ cd ~/git/corpus-image-server 
	$ npm install
	$ cd ~/git/corpus-image-server/public/lib/exiv2
	$ npm install	

### Mount the foto drive
Install the cifs libraries for linux

	$ sudo apt-get install cifs-utils

Add this line to your */etc/fstab* file

	//smk.dk/data/globus/ /mnt/fotoarkiv cifs credentials=/root/.credentials,iocharset=utf8,file_mode=0777,dir_mode=0777 0 0

Create a */root/.credentials* file containing the username & password (because /etc/fstab is visible to all)
	
	username=administrator
	password=xxxxxxxxxx
	
Create the mount directory and reload fstab

	$ mkdir -p /mnt/fotoarkiv
	$ mount -a

## Run the application	

	$ node app.js

Logs will be rotated to *server[1-5].log* 

### Managing the application lifetime

Install 'supervisor' to ensure the node application is kept running, even after reboot

    $ sudo apt-get update
    $ sudo apt-get install supervisor

Add the following to */etc/supervisor/supervisord.conf* 

	[program:corpusimageserver]
	command=node app.js
	directory=/home/node/git/corpus-image-server
	user=node
	autostart=true
	autorestart=true
	redirect_stderr=true
	environment=NODE_ENV="production"

Run supervisor

    sudo service supervisor restart

Logs can be found at */var/log/supervisor/supervisord.log*.

## API

#### Width mode

In width mode, *width* is the width in pixels of the requested image

	http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=width&width=200

#### Height mode

In height mode, *height* is the height in pixels of the requested image

	http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=height&height=200

#### Scale mode

In scale mode, *width* is the actual width in cm of the original artwork and *scale* is a positive integer.

	http://localhost:4000/globus/CORPUS%202015/KMS6111.jpg?mode=scale&width=250&scale=50


## Nginx

We can install and configure nginx locally as a caching reverse proxy - this will cache the converted
images locally to enable much faster lookups.

	$ sudo apt-get update
	$ sudo apt-get install nginx
	$ sudo vi /etc/nginx/sites-available/default

Delete the current configuration and add the following

	proxy_cache_path /home/node/data/nginx/cache levels=1:2 keys_zone=cache_zone:10m;

	server {
	  listen 80;
	
	  location / {
	    proxy_pass http://127.0.0.1:4000;
	    proxy_cache cache_zone;
	    proxy_cache_min_uses 1;
	    proxy_cache_valid 200 301 302 120m;
	    proxy_cache_valid 404 1m;
	    expires max;
	  }
	}

and restart

	$ sudo service nginx restart

The application can now be accessed at (for example)

	http://cspic-02
