    // IIPMooViewer options: See documentation at http://iipimage.sourceforge.net for more details
    // Server path: set if not using default path
                                                                                                                                                                                                              
    // Copyright or information message    
    var credit = "&copy; Copyright or Public Domain";


   // Create our viewer object
    // See documentation for more details of options
    new IIPMooViewer( "viewer", {

  	image: image,
		server: server,
		credit: credit, 
		scale: 7.17,
		showNavWindow: true,
		showNavButtons: true,
		winResize: true,
		protocol: 'iip',
//	  annotations: annotations,
    navWinSize : 0.07     
  
    });