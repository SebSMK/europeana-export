(function (root, factory) {
	if (typeof exports === "object" && exports) {
		factory(exports); // CommonJS
	} else {
		var common = {};
		factory(common);
		if (typeof define === "function" && define.amd) {
			define(common); // AMD
		} else {
			root.smkCommon = common; // <script>
		}
	}
}(this, function (common) {			

	config = {
    configurable: true,
    value: function() {
      var alt = {};
      var storeKey = function(key) {
        alt[key] = this[key];
      };
      Object.getOwnPropertyNames(this).forEach(storeKey, this);
      return alt;
    }
  };  
  Object.defineProperty(Error.prototype, 'toJSON', config);  
  
  common.guid = function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  };
  
	common.getValueFromSplit = function(splited, index){		
		return splited.length > index && common.isValidDataText(splited[index]) ? splited[index] : null;		
	};
	
	common.firstCapital = function(string){				
		return !this.isValidDataText(string) ? '' : string.charAt(0).toUpperCase() + string.slice(1)		
	};
	
	common.isValidDataText = function(text, field){
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

	common.replace_dansk_char = function(text) {				

		if (!common.isValidDataText(text))
			return text;			

		text = text.toLowerCase();
		
		var res = text;

		// utf8 encoding (JSON)
		if (text.match(/[aoaé]/g) != null)
			res = text.replace( /[a]/g, "ae" ).replace( /[o]/g, "oe" ).replace( /[a]/g, "aa" ).replace( /[é]/g, "e" );						

		// 
		if (res.match(/[????]/g) != null)
			res = text.replace( /?/g, "ae" ).replace( /?/g, "oe" ).replace( /?/g, "aa" ).replace( /?/g, "e" );						

		return res;
	};
	
	common.replace_non_alpha_char = function(text) {				

		if (text === undefined)
			return text;			

		text = text.toLowerCase();
		
		var res = text.replace( /[^a-zA-Z]/g, "_" );												

		return res;
	};				


	common.removeFirstFromArray = function (arr) {
		if (!AjaxSolr.isArray(arr))
			return [];

		var what, a = arguments, L = a.length, ax;
		what = a[--L];
		
		if(arr.length > 0 && arr[0].value == what)
			arr.splice(0, 1);
		
		return arr;
	};	
  
  common.validateRequest = function(request, url, config) {
                
        if( Object.prototype.toString.call( request.params ) !== '[object Array]' ||
            request.params.length == 0)
          return false;
                
        var parsedUrl = url.parse(request.params[0], true),
        path = parsedUrl.pathname,        
        queryParams = url.parse(request.url, true).query;
  
        return config.proxy.options.validHttpMethods.indexOf(request.method) !== -1 &&
           function(){
             for (var p in queryParams){
               var paramPrefix = p.split('.')[0]; // invalidate not just "stream", but "stream.*"
               return config.proxy.options.invalidParams.indexOf(paramPrefix) === -1;
             }           
           };
    };    		

}));