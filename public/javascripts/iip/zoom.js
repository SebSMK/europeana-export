    // IIPMooViewer options: See documentation at http://iipimage.sourceforge.net for more details
    // Server path: set if not using default path
                                                                                                                                                                                                              
    // Copyright or information message    
    var credit = "&copy; Copyright or Public Domain";

    //image = "/tmp/test8(5).jpg_6d9a43dd-1c03-d29f-4713-d4b26cf3968a_pyr.tif";

   // Create our viewer object
    // See documentation for more details of options
    new IIPMooViewer( "viewer", {

  	image: image,
		server: server,
		credit: credit,
		showNavWindow: true,
		showNavButtons: true,
		winResize: true,
		protocol: 'iip',
//	  annotations: annotations,
    navWinSize : 0.07     
  
    });