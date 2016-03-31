
      
    var viewers = [], view_0, view_1, view_2, view_3, view_4;            
    
    /*
    var view = new IIPMooViewer( "viewer0", {    
        image: images_2zoom[0].path,
        server: server,
        showNavWindow: true,
        showNavButtons: true,
        winResize: true,
        navWinSize : 0.07,
        protocol: 'iip'           
      });  
    */
    
    // @array of json data on images to zoom: images_2zoom[{path}]  
    if(images_2zoom.length == 1){
       view_0 = new IIPMooViewer( "viewer0", {    
        image: images_2zoom[0].path,
        server: server,
        showNavWindow: true,
        showNavButtons: true,
        winResize: true,
        navWinSize : 0.07,
        protocol: 'iip'           
      });  
    
    }
    else{
      for (i = 0; i < images_2zoom.length; i++) { 
        viewers[i] = new IIPMooViewer( "viewer" + (i + 1), {    
          image: images_2zoom[i].path,
          server: server,
          showNavWindow: true,
          showNavButtons: true,
          winResize: true,
          protocol: 'iip'           
        });                          
      }
      
      IIPMooViewer.synchronize([viewers[0], viewers[1]] );
    }        
    
    /*
    var image1 = images[0]; 
    var image2 = images[1];


   // Create our viewer object
    // See documentation for more details of options
    var view1 = new IIPMooViewer( "viewer1", {

  	image: image1,
		server: server,
		showNavWindow: true,
		showNavButtons: true,
		winResize: true,
		protocol: 'iip'     
  
    });
    
    var view2 = new IIPMooViewer( "viewer2", {

  	image: image2,
		server: server,
		showNavWindow: false,
		showNavButtons: false,
		winResize: true,
		protocol: 'iip'     
  
    });
    */
    
    //IIPMooViewer.synchronize([view2,view1]); 