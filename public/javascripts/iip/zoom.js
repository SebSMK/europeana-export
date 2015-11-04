    // IIPMooViewer options: See documentation at http://iipimage.sourceforge.net for more details
    // Server path: set if not using default path
                                                                                                                                                                                                              
    // Copyright or information message    
    var credit = "G&aring; p&aring; opdagelse i v&aelig;rket<p><i>h&oslash;jreklik for mere information om zoom funktionalitet.</i></p>";


   // Create our viewer object
    // See documentation for more details of options
    new IIPMooViewer( "viewer", {

  	image: image,
		server: server,
		credit: credit, 
		scale: 7.17,
		showNavWindow: false,
		showNavButtons: true,
		winResize: true,
		protocol: 'iip',
//	  annotations: annotations,
    navWinSize : 0.07     
  
    });