    // IIPMooViewer options: See documentation at http://iipimage.sourceforge.net for more details
    // Server path: set if not using default path
                                                                                                                                                                                                              
    // Copyright or information message    
    var credit = "&copy; Copyright or Public Domain";


   // Create our viewer object
    // See documentation for more details of options
    var view1 = new IIPMooViewer( "viewer1", {

  	image: image1,
		server: server,
		credit: credit,
		showNavWindow: true,
		showNavButtons: true,
		winResize: true,
		protocol: 'iip'     
  
    });
    
    var view2 = new IIPMooViewer( "viewer2", {

  	image: image2,
		server: server,
		credit: credit,
		showNavWindow: false,
		showNavButtons: false,
		winResize: true,
		protocol: 'iip'     
  
    });
    
    IIPMooViewer.synchronize([view2,view1]); 