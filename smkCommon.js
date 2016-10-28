smkCommon = (function(){	
  function smkCommon () {        
        console.log("smkCommon Constructor:");                      
  }  
    
	smkCommon.prototype.version = "000";
	
	smkCommon.prototype.split_1_niv = ";-;";
	smkCommon.prototype.split_2_niv = ";--;";
	smkCommon.prototype.split_3_niv = ";---;";
	smkCommon.prototype.split_4_niv = ";-v;";	
	
	smkCommon.prototype.enum_lang = {'def':'dk', 'en':'en', 'dk':'dk'}; //languages
	
	smkCommon.prototype.getValueFromSplit = function(splited, index){		
		return splited.length > index && this.isValidDataText(splited[index]) ? splited[index] : null;		
	};
	
	smkCommon.prototype.firstCapital = function(string){				
		return !this.isValidDataText(string) ? '' : string.charAt(0).toUpperCase() + string.slice(1)		
	};
	
	smkCommon.prototype.feedlineToHTML = function(text){
		if (!this.isValidDataText(text)) return text;
		
		var conv = text.replace(/\r\n\r\n/g, "</p><p>").replace(/\n\n/g, "</p><p>");
		conv = conv.replace(/\r\n/g, "<br />").replace(/\n/g, "<br />");
		
		return conv;
		
	};
	
	smkCommon.prototype.isValidDataText = function(text, field){
		text = new String(text);
		if (text === undefined 
				|| text == null 
				|| text == 'undefined'
				|| text == 'null' 
				|| text == '(blank)' 
				|| text.trim() == '')
			return false;

		var field_expr = field === undefined ? 'defaut' : field;
		text = text.trim().toLowerCase();

		switch(field_expr) {
		case 'role':
			if(text == 'original')
				return false
				break;              
		case 'agent':
			if(text == 'unknown')
				return false
				break;
		case 'date':              
		case 'orga_place':
		case 'natio':
			if(text == 'undefined'
				|| text == 'null' 
				|| text == ''
				|| text == '(?)')
				return false
				break;          
		} 

		return true;

	}; 

	smkCommon.prototype.ordinal_suffix = function (i) {
		var j = 0;
		
		while(i > 21){
			i = i / 10;
		}
			
		if (j == 1 && i != 11) {
			return "st";
		}
		if (j == 2 && i != 12) {
			return "nd";
		}
		if (j == 3 && i != 13) {
			return "rd";
		}
		return "th";
	};

	smkCommon.prototype.replace_dansk_char = function(text) {				

		if (!this.isValidDataText(text))
			return text;			

		text = text.toLowerCase();
		
		var res = text;

		// utf8 encoding (JSON)
		if (text.match(/[æøåé]/g) != null)
			res = text.replace( /[æ]/g, "ae" ).replace( /[ø]/g, "oe" ).replace( /[å]/g, "aa" ).replace( /[é]/g, "e" );						

		// 
		if (res.match(/[����]/g) != null)
			res = text.replace( /�/g, "ae" ).replace( /�/g, "oe" ).replace( /�/g, "aa" ).replace( /�/g, "e" );						

		return res;
	};
	
	smkCommon.prototype.replace_non_alpha_char = function(text) {				

		if (text === undefined)
			return text;			

		text = text.toLowerCase();
		
		var res = text.replace( /[^a-zA-Z]/g, "_" );												

		return res;
	};
	
	smkCommon.prototype.isElemIntoView = function(elem){		   		    								
		return $(elem).visible(true, false, 'vertical');
	};			

	smkCommon.prototype.getDefaultPicture = function(size){		
		var picturePath = ""
			var server = this.getCurrentServerName();
		var pluginPath = this.getCurrentPluginDir();

		switch(size){
		case "small":		 			  			  			  
			picturePath = 'http://%s/%simages/default_picture_2_small.png';					  			  			  
			break;
		case "medium":		 			  			  			  
			picturePath = 'http://%s/%simages/default_picture_2_medium.png';					  			  			  
			break;
		case "large":		 			  			  			  
			picturePath = 'http://%s/%simages/default_picture_2_large.png';					  			  			  
			break;
		default:		    			  			   							  
			picturePath = 'http://%s/%simages/default_picture_2_small.png';		  	 		  	  
		break;		  
		}	

		return sprintf(picturePath, server, pluginPath);
	};

	smkCommon.prototype.getPluginURL = function(){
		var server = this.getCurrentServerName();
		var pluginPath = this.getCurrentPluginDir();

		return sprintf('http://%s/%s', server, pluginPath);				
	};		

	smkCommon.prototype.getCurrentLanguage = function(){		
		return ModelManager.get_lang();
	};

	smkCommon.prototype.getCurrentPluginDir = function(){		
		return smkSearchAllConf.pluginDir;
	};

	smkCommon.prototype.getCurrentServerName = function(){		
		return smkSearchAllConf.serverName;
	};		

	smkCommon.prototype.getSearchPOST = function (){
		return smkSearchAllConf.searchStringPOST;
	};	


	smkCommon.prototype.removeFirstFromArray = function (arr) {
		if (!AjaxSolr.isArray(arr))
			return [];

		var what, a = arguments, L = a.length, ax;
		what = a[--L];
		
		if(arr.length > 0 && arr[0].value == what)
			arr.splice(0, 1);
		
		return arr;
	};	
	
	smkCommon.prototype.setVersion = function(version){
		if(version !== undefined)
			this.version = version;
	};
	
	smkCommon.prototype.getVersion = function(version){		
		return this.version;
	};
	
	/*** debug mode ****/
	
	smkCommon.prototype.mode = "prod";
	
	smkCommon.prototype.setMode = function(mode){
		if(mode !== undefined)
			this.mode = mode;
	};
	
	smkCommon.prototype.getMode = function(mode){		
		return this.mode;
	};			
	
	smkCommon.prototype.debugTime = function(){		
		return this.mode.indexOf("perf") >= 0;			
	};	
	
	smkCommon.prototype.debugLog= function(){
		return this.mode.indexOf("debug") >= 0			
	};	
	
  return smkCommon;

})();


module.exports = smkCommon;