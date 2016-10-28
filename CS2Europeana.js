var sprintf = require('sprintf-js').sprintf;
var smkCommonC = require('./smkCommon');
var smkCommon = new smkCommonC(); 
var europeanaPayload = require('./europeanaPayload');


CS2EuropeanaAdapter = (function(){
		
    /**
     * Constructor
     **/
     
    function CS2EuropeanaAdapter (config) {        
        console.log("CS2EuropeanaAdapter Constructor");
        this.SMKAPIGetImgUri = config.SMKAPIGetImgUri;                      
    }          


     /**
     * Public methods
     **/
    CS2EuropeanaAdapter.prototype.convert = function (smkdoc){
      var smkdata = this.get_data(smkdoc);
      europeanaPayload.languageAwareFields[0].language = "en";
      europeanaPayload.languageAwareFields[0].title = smkdata.info.title_museum;
      europeanaPayload.languageAwareFields[0].source[0] = smkdata.info.acq.value;
      
      europeanaPayload.languageNonAwareFields.identifier[0] = smkdata.info.ident_invnummer.value;
      
      
      smkdata.info.artist.forEach(function(data, index) {				
        europeanaPayload.agents[0].languageAwareFields[0].language = "en";
        europeanaPayload.agents[0].languageAwareFields[0].preferredLabel = data.name;				
			});
            
      europeanaPayload.webLinks[0].link = sprintf(this.SMKAPIGetImgUri, smkdata.info.ident_invnummer.value, 'large');
      
      return europeanaPayload;  
    };
    
		CS2EuropeanaAdapter.prototype.get_data = function (doc){
			var data =  {

					media:{
						title: this.getFirstTitle(doc),	
						alt: this.getMedia_alt(doc),
						image: this.getMedia_image(doc, 'large'),						
						image_full_path: doc.medium_image_url,
						no_image: doc.medium_image_url === undefined ? true : false,																		
						img_id:doc.id,						 
					},					
					
					info:{
						
						ident_invnummer: {							  
							value: this.getIdent_invnummer(doc)
						},
						
						artist: this.getProducent_all_producers(doc),																																					
						
						title_museum: this.getFirstTitle(doc),													
						
						datering: {							  
							value: this.getProduction_vaerkdatering(doc)
						},
						
						technique: {							  
							value: this.getTechnique_technique(doc)
						},
						
						dim: {											    	
								dim : this.getTechnique_dimensions(doc).length > 0 ? this.getTechnique_dimensions(doc)[0].dim : null  
						},
						
						acq: {										    	
							value: this.getDetailAcq(doc)														
						}
					}

			};	

			return data;	  
		};
		
		
		CS2EuropeanaAdapter.prototype.getDetailAcq = function(doc){
			var method = this.isValidDataText(this.getErhverv_method(doc)) ? sprintf('%s', this.getErhverv_method(doc)) : "";
			var source = this.isValidDataText(this.getErhverv_source(doc)) ? sprintf(' %s', this.getErhverv_source(doc)) : "";
			var dato = this.isValidDataText(this.getErhverv_dato(doc)) ? sprintf(' %s', this.getErhverv_dato(doc)) : "";	 
			
			return this.isValidDataText(this.getErhverv_method(doc)) || this.isValidDataText(this.getErhverv_source(doc)) || this.isValidDataText(this.getErhverv_dato(doc)) ? 
					sprintf("%s%s%s", method, source, dato) : null;
			
		};				
		
		CS2EuropeanaAdapter.prototype.getArtistOutput = function(doc){
			var res = {};
			
			if (doc.name != undefined)
				res.name = doc.name;
			
			var role = this.isValidDataText(doc.type) ? sprintf(', %s', doc.type) : "";
			var dates = this.isValidDataText(doc.dates) ? sprintf(', %s', doc.dates) : "";
			var nationality = this.isValidDataText(doc.nationality) ? sprintf('%s', doc.nationality) : "";												
			
			res.info = nationality || dates ? sprintf('(%s%s)', nationality, dates) : "";			
			res.info = sprintf('%s%s', res.info, role);
			
			return res;
		};					
		
		CS2EuropeanaAdapter.prototype.getImage = function ($src){			

			if ($src === undefined || $src.length == 0)				
				return;			
			
			var path = $src.attr("src");
			var alt = $src.attr("alt");
			var title = $src.attr("alt");
			
			return '<img src="' + path + '" />'; 
		};				  		
	
    CS2EuropeanaAdapter.prototype.isValidDataText = function(text, field){
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
  
  
	

	/**
	 * Identification
	 * */
	CS2EuropeanaAdapter.prototype.getIdent_vaerktype = function(doc){							
		var vaerktype;

		switch(this.getCurrentLanguage()){
		case "dk":		 			  			  			  
			vaerktype = doc.object_type_dk;
			break;
		case "en":
			vaerktype = doc.object_type_en;
			break;
		}

		return this.isValidDataText(vaerktype) ? vaerktype : null;

	};		

	CS2EuropeanaAdapter.prototype.getIdent_dele = function(doc){			
		return doc.numberofobjects === undefined ? null : doc.numberofobjects;
	};

	CS2EuropeanaAdapter.prototype.getIdent_invnummer = function(doc){			
		return doc.id === undefined ? null : doc.id;
	};	

	CS2EuropeanaAdapter.prototype.getIdent_andet_inv = function(doc){			
		return doc.other_numbers_andet_inventar === undefined ? null : doc.other_numbers_andet_inventar;
	};


	/**
	 * Producent
	 * */
	CS2EuropeanaAdapter.prototype.getProducent_producent = function(doc, role){
		var artistData = new Array();
		var docBirth;
		var docDeath;
		var docNatio;

		switch(this.getCurrentLanguage()){
		case "dk":		 			  			  			  
			docBirth = doc.artist_birth_dk;
			docDeath = doc.artist_death_dk;	
			docNatio = doc.artist_natio_dk;
			break;
		case "en":
			docBirth = doc.artist_birth_en;
			docDeath = doc.artist_death_en;
			docNatio = doc.artist_natio_en; 
			break;
		}

		if (doc.artist_name !== undefined){
			// check if all arrays containing artist's data have the same size
			if((doc.artist_name.length != doc.artist_auth.length) && (doc.artist_name.length != doc.artist_natio_dk.length)  && (doc.artist_name.length != docBirth.length) && (doc.artist_name.length != docDeath.length))
				return doc.artist_name;

			for (var i = 0, l = doc.artist_name.length; i < l; i++) {
				if(doc.artist_auth[i] == role){
					var name = doc.artist_name[i];						
					var nationality = this.isValidDataText(docNatio[i], 'natio') ? docNatio[i] : '';
					var birth = docBirth[i];
					var death = this.isValidDataText(docDeath[i], 'date') ? docDeath[i] : (docBirth[i] < 1800) ? '(?)' : '';
					var dates = this.isValidDataText(docDeath[i], 'date') || this.isValidDataText(docBirth[i], 'date') ? sprintf('%s - %s', birth, death) : '';
					var auth = !this.isValidDataText(doc.artist_auth[i]) || doc.artist_auth[i] == 'original' ? '' : doc.artist_auth[i]; 

					artistData.push({'artist_data' : 
					{'name' : name,
						'nationality' : nationality,
						'dates' : dates,
						'role': auth}
					});
					//artistData.push(name);

				}
			}		  		  
		}	  

		return artistData;
	};	

	CS2EuropeanaAdapter.prototype.getProducent_all_producers = function(doc){		
		var self = this;
		var res = new Array();
		var list = new Array();

    for (var key in CS2EuropeanaAdapter.prototype.enumProducent){
      var type = CS2EuropeanaAdapter.prototype.enumProducent[key]; 
			var prod_datas = CS2EuropeanaAdapter.prototype.getProducent_producent(doc, type);

			prod_datas.forEach(function(data, index) {
				data.artist_data.type = key;
				res.push(data.artist_data);					
			});								
		};			

		return res; 			
	};

	CS2EuropeanaAdapter.prototype.getProducent_formeri = function(doc){			
		return doc.formeri === undefined ? null : doc.formeri;
	};

	CS2EuropeanaAdapter.prototype.getProducent_objectophavsbeskrivelse= function(doc){
		if (doc.objectophavsbeskrivelse === undefined) 
			return null;

		var res = [];
		var split = doc.objectophavsbeskrivelse.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			res.push({value:split[i]});					
		}				

		return res.length > 0 ? res : null;		
	};				

	/**
	 * Titles
	 * */
	CS2EuropeanaAdapter.prototype.getTitle = function(doc, type){
		if (doc.title_all === undefined) 
			return null;

		var self = this;
		var titles_split = doc.title_all.split(this.split_1_niv);
		var titles_data = [];			
		var arrayLength = titles_split.length;

		for (var i = 0; i < arrayLength; i++) {					
			var values = titles_split[i].split(this.split_2_niv);			
			if(this.getValueFromSplit(values, 4) != null && this.getValueFromSplit(values, 4).indexOf(type) > -1 ||
					(this.getValueFromSplit(values, 4) == null && type == 'museum') || 
					(this.getValueFromSplit(values, 4) != null && this.getValueFromSplit(values, 4).indexOf('blank') > -1 && type == 'museum') ||
					type == 'first' ||
					type == 'all'){
				var title = this.getValueFromSplit(values, 0);
				var title_note = this.getValueFromSplit(values, 1);
				var title_lang = this.getValueFromSplit(values, 2);
				var title_transl = this.getValueFromSplit(values, 3);				
				var title_type = this.getValueFromSplit(values, 4) == null ? 'museum' : this.getValueFromSplit(values, 4);
				var tmp;
				//var translation = new String();
				var translation = [];

				// we proceed all translations
				if(this.isValidDataText(title_transl)){
					var split_trans = title_transl.split(this.split_3_niv); 	           

					for (var j = 0; j < split_trans.length; j++) {
						var split_trans_values = split_trans[j].split(this.split_4_niv);
						var split_trans_value = this.getValueFromSplit(split_trans_values, 0);
						var split_trans_lang = this.getValueFromSplit(split_trans_values, 1);
						var split_trans_note = this.getValueFromSplit(split_trans_values, 2);
						var split_trans_json = {};
						
						if(this.isValidDataText(split_trans_value)){
							split_trans_json['value'] = split_trans_value;
							
							if(this.isValidDataText(split_trans_note))
								split_trans_json['note'] = split_trans_note;
							
							if(this.isValidDataText(split_trans_lang))
								split_trans_json['lang'] = split_trans_lang;
													
							translation.push(split_trans_json);							
						}
								
					}	
					
				}        	  		  

				tmp = {'title' : title, 'type':title_type};

				if(this.isValidDataText(title_note))
					tmp.note = title_note;

				if(this.isValidDataText(translation))
					tmp.trans = translation;								

				titles_data.push(tmp);	

				if(type == 'first')
					break; // in this case, we want only the first title in the list
			}				
		};

		return titles_data.length > 0 ? titles_data : null;			
	};

	CS2EuropeanaAdapter.prototype.getFirstTitle = function(doc){			
		var title_teaser = this.getTitle(doc, 'first');			
		var title = doc.title_first;

		if(title_teaser != null && title_teaser.length > 0){
			switch(this.getCurrentLanguage()){
			case "dk":		 		
				title = title_teaser[0].title;
				break;
			case "en":
				//title = this.isValidDataText(title_teaser[0].trans) ? title_teaser[0].trans[0].value : title_teaser[0].title;
				if(this.isValidDataText(title_teaser[0].trans)){
					
					title = title_teaser[0].title;	
					
					for (var i = 0; i < title_teaser[0].trans.length; i++) {
						if(title_teaser[0].trans[i].lang.indexOf("eng") > -1){
							title = title_teaser[0].trans[0].value;
							break;
						}
					}
				}
				
				break;
			}									
		}

		return this.isValidDataText(title) ? title : null;
	};

	/**
	 * Production date
	 * */
	CS2EuropeanaAdapter.prototype.getProduction_vaerkdatering = function(doc){

		var vaerkdatering;

		switch(this.getCurrentLanguage()){
		case "dk":		 			  			  			  
			vaerkdatering = doc.object_production_date_text_dk;
			break;
		case "en":
			vaerkdatering = doc.object_production_date_text_en;
			break;
		}

		return this.isValidDataText(vaerkdatering) ? vaerkdatering : null;
	};			

	CS2EuropeanaAdapter.prototype.getProduction_udgivet_place = function(doc){	
		if (doc.object_production_place_udgivet === undefined) 
			return null;

		var res = [];
		var split = doc.object_production_place_udgivet.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {				
			res.push({value:split[i]});		
		}				

		return res.length > 0 ? res : null;						
	};

	CS2EuropeanaAdapter.prototype.getProduction_udfoert_place = function(doc){
		if (doc.object_production_place_udfoert === undefined) 
			return null;

		var res = [];
		var split = doc.object_production_place_udfoert.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			res.push({value:split[i]});							
		}	
		
		return res.length > 0 ? res : null;	
	};

	CS2EuropeanaAdapter.prototype.getProduction_note = function(doc){					
		if (doc.object_production_note === undefined) 
			return null;

		var res = [];
		var split = doc.object_production_note.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			res.push({value:split[i]});					
		}				

		return res.length > 0 ? res : null;
	};

	/**
	 * Technique
	 * */	

	CS2EuropeanaAdapter.prototype.getTechnique_technique = function (doc){			
		if (doc.prod_technique_dk === undefined && doc.prod_technique_en === undefined) 
			return null;

		var technique;
		var technique_all = [];
		var default_value = null;						

		switch(this.getCurrentLanguage()){
		case "dk":		 			  			  			  
			technique = doc.prod_technique_dk !== undefined ? doc.prod_technique_dk : default_value;					  			  			  
			break;
		case "en":
			technique = doc.prod_technique_en !== undefined ? doc.prod_technique_en : default_value;
			break;
		default:	
			technique = default_value;
		break;		  
		}

		if(this.isValidDataText(technique)){
			var tech_split = technique.split(this.split_1_niv);							
			var arrayLength = tech_split.length;

			for (var i = 0; i < arrayLength; i++) {	
				technique_all.push({value:tech_split[i]});					
			}				
		}

		return technique_all.length == 0 ? null : technique_all;

	};

	CS2EuropeanaAdapter.prototype.getTechnique_dimensions = function (doc){

		var dimensions = new Array();			

		if (doc.dimension_netto !== undefined)
			dimensions.push( 
					{
						'type' : 'netto',
						'dim' : doc.dimension_netto
					}
			);	

		if (doc.dimension_bladmaal !== undefined)
			dimensions.push( 
					{
						'type' : 'bladmaal',
						'dim' : doc.dimension_bladmaal
					}
			);			

		if (doc.dimension_plademaal!== undefined)
			dimensions.push( 
					{
						'type' : 'plademaal',
						'dim' : doc.dimension_plademaal
					}
			);

		if (doc.dimension_brutto !== undefined)
			dimensions.push( 
					{
						'type' : 'brutto',
						'dim' : doc.dimension_brutto
					}
			);	

		if (doc.dimension_billedmaal !== undefined)
			dimensions.push( 
					{
						'type' : 'billedmaal',
						'dim' : doc.dimension_billedmaal
					}
			);	

		if (doc.dimension_monteringsmaal!== undefined)
			dimensions.push( 
					{
						'type' : 'monteringsmaal',
						'dim' : doc.dimension_monteringsmaal
					}
			);	

		return dimensions;
	};				

	CS2EuropeanaAdapter.prototype.getTechnique_diameter = function(doc){			
		return doc.dimension_diameter === undefined ? null : doc.dimension_diameter;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_vaegt = function(doc){			
		return doc.dimension_weight === undefined ? null : doc.dimension_weight;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_materiale = function(doc){
		var mat;
		var mat_all = [];
		var default_value = null;						

		switch(this.getCurrentLanguage()){
		case "dk":		 			  			  			  
			mat = doc.materiale !== undefined ? doc.materiale : default_value;					  			  			  
			break;
		case "en":
			mat = doc.materiale_en !== undefined ? doc.materiale_en : default_value;
			break;
		default:	
			mat = default_value;
		break;		  
		}

		if( Object.prototype.toString.call( mat ) === '[object Array]' ){									
			var arrayLength = mat.length;

			for (var i = 0; i < arrayLength; i++) {	
				var values = mat[i].split(this.split_2_niv); 					 										
				var mat_val = this.getValueFromSplit(values, 0) != null ? this.getValueFromSplit(values, 0) : "";
				var mat_type = this.getValueFromSplit(values, 1) != null ? this.getValueFromSplit(values, 1) : "";					
				var res = {	mat_val: mat_val, 
						mat_type: mat_type};

				mat_all.push(res);					
			}				
		}

		return mat_all;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_format = function(doc){			
		return doc.form === undefined ? null : doc.form;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_watermark = function(doc){			
		return doc.watermark === undefined ? null : doc.watermark;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_tilstand = function(doc){			
		return doc.physicaldescription === undefined ? null : doc.physicaldescription;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_vaerkstatus = function(doc){			
		if (doc.vaerkstatus === undefined) 
			return null;

		var res = [];
		var split = doc.vaerkstatus.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			res.push({value:split[i]});					
		}				

		return res.length > 0 ? res : null;
	};


	CS2EuropeanaAdapter.prototype.getTechnique_vaerkstatus_translate = function(vaerkstatus, caller){
		if (!this.isValidDataText(vaerkstatus)) 
			return null;
		
		var res = [];									
		var arrayLength = vaerkstatus.length;

		for (var i = 0; i < arrayLength; i++) {	
			var vaerktag = smkCommon.replace_non_alpha_char(smkCommon.replace_dansk_char(vaerkstatus[i].value));
			var value = caller.manager.translator.getLabel('vaerkstatus_' + vaerktag);	
			res.push({value:value});					
		}				

		return res.length > 0 ? res : null;
		
		
	};

	CS2EuropeanaAdapter.prototype.getTechnique_eksemplar = function(doc){			
		return doc.oplag === undefined ? null : doc.oplag;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_bladnummer = function(doc){			
		return doc.other_numbers_bladnummer === undefined ? null : doc.other_numbers_bladnummer;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_sidetal = function(doc){			
		return doc.other_numbers_sidetal === undefined ? null : doc.other_numbers_sidetal;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_omslag = function(doc){			
		return doc.omslag === undefined ? null : doc.omslag;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_stadium = function(doc){			
		return doc.stadium === undefined ? null : doc.stadium;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_kollation = function(doc){
		if (doc.object_briefdescriptions === undefined) 
			return null;

		var res = [];
		var split = doc.object_briefdescriptions.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			if (CS2EuropeanaAdapter.prototype.getIdent_invnummer(doc).indexOf("/") == -1){ // Only for parent artwork				
				var conv_text = smkCommon.feedlineToHTML(split[i]);
				res.push({value: conv_text});
			}
		}				

		return res.length > 0 ? res : null;

	};

	CS2EuropeanaAdapter.prototype.getTechnique_note_vaerkstatus = function (doc){			
		if (doc.description_note_dk === undefined && doc.description_note_en === undefined) 
			return null;

		var status;
		var status_all = [];
		var default_value = null;						

		switch(this.getCurrentLanguage()){
		case "dk":		 			  			  			  
			status = doc.description_note_dk !== undefined ? doc.description_note_dk : default_value;					  			  			  
			break;
		case "en":
			status = doc.description_note_en !== undefined ? doc.description_note_en : doc.description_note_dk !== undefined ? doc.description_note_dk : default_value;
			break;
		default:	
			status = default_value;
		break;		  
		}

		if(this.isValidDataText(status)){
			var status_split = status.split(this.split_1_niv);							
			var arrayLength = status_split.length;

			for (var i = 0; i < arrayLength; i++) {	
				status_all.push({value: status_split[i]});					
			}				
		}

		return status_all;

	};

	CS2EuropeanaAdapter.prototype.getTechnique_opstilling = function(doc){			
		return doc.opstilling === undefined ? null : doc.opstilling;
	};

	CS2EuropeanaAdapter.prototype.getTechnique_note_elementer = function(doc){			
		return doc.note_elementer === undefined ? null : doc.note_elementer;
	};		

	/**
	 * Inscription
	 * */

	CS2EuropeanaAdapter.prototype.getInscription_signatur = function(doc){
		if (doc.inscription_signatur === undefined) 
			return null;

		var res = [];
		var inscr_split = doc.inscription_signatur.split(this.split_1_niv);							
		var arrayLength = inscr_split.length;

		for (var i = 0; i < arrayLength; i++) {					
			var conv_text = smkCommon.feedlineToHTML(inscr_split[i]);
			res.push({value: conv_text});
		}				

		return res.length > 0 ? res : null;
	};

	CS2EuropeanaAdapter.prototype.getInscription_tryktsignatur = function(doc){	
		if (doc.inscription_tryktsignatur === undefined) 
			return null;

		var res = [];
		var inscr_split = doc.inscription_tryktsignatur.split(this.split_1_niv);							
		var arrayLength = inscr_split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var conv_text = smkCommon.feedlineToHTML(inscr_split[i]);
			res.push({value: conv_text});					
		}				

		return res.length > 0 ? res : null;
	};

	CS2EuropeanaAdapter.prototype.getInscription_paaskrift = function(doc){
		if (doc.inscription_paaskrift === undefined) 
			return null;

		var res = [];
		var inscr_split = doc.inscription_paaskrift.split(this.split_1_niv);							
		var arrayLength = inscr_split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var conv_text = smkCommon.feedlineToHTML(inscr_split[i]);
			res.push({value: conv_text});						
		}				

		return res.length > 0 ? res : null;
	};

	CS2EuropeanaAdapter.prototype.getInscription_trykttekst = function(doc){
		if (doc.inscription_trykttekst === undefined) 
			return null;

		var res = [];
		var inscr_split = doc.inscription_trykttekst.split(this.split_1_niv);							
		var arrayLength = inscr_split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var conv_text = smkCommon.feedlineToHTML(inscr_split[i]);
			res.push({value: conv_text});					
		}				

		return res.length > 0 ? res : null;
	};

	CS2EuropeanaAdapter.prototype.getInscription_samlermaerke = function(doc){
		if (doc.inscription_samlermaerke === undefined) 
			return null;

		var res = [];
		var inscr_split = doc.inscription_samlermaerke.split(this.split_1_niv);							
		var arrayLength = inscr_split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var conv_text = smkCommon.feedlineToHTML(inscr_split[i]);
			res.push({value: conv_text});					
		}				

		return res.length > 0 ? res : null;
	};				

	/**
	 * Acquisition
	 * */
	CS2EuropeanaAdapter.prototype.getErhverv_dato = function(doc){						
		var date;
		var default_value = null;

		switch(this.getCurrentLanguage()){
		case "dk":		 			  			  			  
			date = doc.acq_date !== undefined ? doc.acq_date : default_value;					  			  			  
			break;
		case "en":
			date = doc.acq_date_eng !== undefined ? doc.acq_date_eng : default_value;
			break;
		default:	
			date = default_value;
		break;		  
		}

		return date;
	};

	CS2EuropeanaAdapter.prototype.getErhverv_method = function(doc){						
		return doc.acq_method === undefined ? null : doc.acq_method;
	};

	CS2EuropeanaAdapter.prototype.getErhverv_source= function(doc){						
		return doc.acq_source === undefined ? null : doc.acq_source;
	};							

	CS2EuropeanaAdapter.prototype.getErhverv_proveniens = function(doc){	
		if (doc.proveniens === undefined) 
			return null;

		var res = [];
		var split = doc.proveniens.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var conv_text = smkCommon.feedlineToHTML(split[i]);
			res.push({value: conv_text});				
		}				

		return res.length > 0 ? res : null;								
	};

	/**
	 * References
	 * */
	CS2EuropeanaAdapter.prototype.getReferences_vaerkfortegn = function(doc){			
		return doc.other_numbers_vaerkfortegn === undefined ? null : doc.other_numbers_vaerkfortegn;
	};

	CS2EuropeanaAdapter.prototype.getReferences_gernsheim = function(doc){			
		return doc.other_numbers_gernsheim === undefined ? null : doc.other_numbers_gernsheim;
	};

	CS2EuropeanaAdapter.prototype.getReferences_beckett = function(doc){			
		return doc.other_numbers_beckett === undefined ? null : doc.other_numbers_beckett;
	};

	CS2EuropeanaAdapter.prototype.getReferences_texts = function(doc){
		if(doc.reference_texts === undefined)
			return null;


		var split = doc.reference_texts.split(this.split_1_niv);
		var arrayLength = split.length;
		var default_value = null;
		var reference_texts = [];

		for (var i = 0; i < arrayLength; i++) {	
			var values = split[i].split(this.split_2_niv);
			var type = this.getValueFromSplit(values, 0);
			var text = this.getValueFromSplit(values, 1);
			var author = this.getValueFromSplit(values, 3);
			var date = this.getValueFromSplit(values, 4);

			if(this.isValidDataText(text)){
				text = smkCommon.feedlineToHTML(text);

				var lang = this.getValueFromSplit(values, 2);
				var current_lang = "";

				switch(this.getCurrentLanguage()){
				case "dk":		 			  			  			  
					current_lang = "dansk";
					break;
				case "en":
					current_lang = "engelsk";
					break;
				}

				if(this.isValidDataText(lang) && lang.indexOf(current_lang) > -1){
					var json = {};

					json['value'] = text;

					if(this.isValidDataText(type))
						json['type'] = type;

					if(this.isValidDataText(author))
						json['author'] = author;

					if(this.isValidDataText(date))
						json['date'] = date;						

					reference_texts.push(json);
				}

			}
		}				

		return reference_texts.length == 0 ? null : reference_texts;

	};	

	CS2EuropeanaAdapter.prototype.getReferences_litteratur = function(doc){			
		if (doc.citations === undefined) 
			return null;

		var citations_split = doc.citations.split(this.split_1_niv);
		var citations_data = [];			
		var arrayLength = citations_split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var values = citations_split[i].split(this.split_2_niv);

			if (this.isValidDataText(this.getValueFromSplit(values, 1))){					
				var agent = this.getValueFromSplit(values, 0);
				var title = this.getValueFromSplit(values, 1);
				var place = this.getValueFromSplit(values, 2);
				var date = this.getValueFromSplit(values, 3);
				var refnote = this.getValueFromSplit(values, 4);  
				var tmp;

				tmp = sprintf('%s%s%s%s%s' , 
						this.isValidDataText(agent, 'agent') ? sprintf('%s : ', agent ) : '',
								this.isValidDataText(title) ? sprintf('<span>%s</span> : ', title ) : '',						
										this.isValidDataText(place) ? sprintf('%s ', place ) : '',
												this.isValidDataText(date) ? sprintf('<i>%s</i> :', date ) : ' :',
														this.isValidDataText(refnote) ? sprintf('%s', refnote ) : '');

				citations_data.push({value:tmp});
			}
		};

		return citations_data.length == 0 ? null : citations_data;

	};

	/**
	 * Exhibitions
	 * */
	CS2EuropeanaAdapter.prototype.getUdstilling_udstilling = function(doc){
		if (doc.exhibitionvenues === undefined) 
			return null;

		var exhibitionvenues_split = doc.exhibitionvenues.split(this.split_1_niv);			
		var exhibitions_data = [];			
		var arrayLength = exhibitionvenues_split.length;

		for (var i = 0; i < arrayLength; i++) {
			var values = exhibitionvenues_split[i].split(this.split_2_niv);

			if (this.isValidDataText(this.getValueFromSplit(values, 1))){

				var title = this.getValueFromSplit(values, 0);
				var place = this.getValueFromSplit(values, 1);
				var date_start = this.getValueFromSplit(values, 2);
				var date_end = this.getValueFromSplit(values, 3);   
				var tmp;

				tmp = sprintf('<span>%s</span> : %s : <i>%s | %s</i>' , 							
						title, 
						place, 
						date_start, 
						date_end);

				if (this.isValidDataText(title))
					exhibitions_data.push({value:tmp});	      			
			}	      			      
		};

		return exhibitions_data.length == 0 ? null : exhibitions_data;
	}

	/**
	 * Remarks
	 * */
	CS2EuropeanaAdapter.prototype.getBemaerk_anden_litt = function(doc){	
		if (doc.comments === undefined) 
			return null;

		var res = [];
		var split = doc.comments.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var conv_text = smkCommon.feedlineToHTML(split[i]);
			res.push({value: conv_text});					
		}				

		return res.length > 0 ? res : null;		
	};

	/**
	 * Motiv
	 * */
	CS2EuropeanaAdapter.prototype.getMotiv_topografisk = function(doc){	
		if (doc.topografisk_motiv === undefined) 
			return null;

		var res = [];
		var split = doc.topografisk_motiv;							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			res.push({value:split[i]});						
		}				

		return res.length > 0 ? res : null;		
	};

	CS2EuropeanaAdapter.prototype.getMotiv_portraet = function(doc){
		if (doc.portrait_person === undefined) 
			return null;

		var res = [];
		var split = doc.portrait_person;							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			res.push({value:split[i]});					
		}				

		return res.length > 0 ? res : null;	
	};

	CS2EuropeanaAdapter.prototype.getMotiv_note = function(doc){	
		if (doc.content_notes === undefined) 
			return null;

		var res = [];
		var split = doc.content_notes.split(this.split_1_niv);							
		var arrayLength = split.length;

		for (var i = 0; i < arrayLength; i++) {	
			var conv_text = smkCommon.feedlineToHTML(split[i]);
			res.push({value: conv_text});					
		}				

		return res.length > 0 ? res : null;		
	};

	/**
	 * Subwidgets
	 * */

	/* Request for Original work */
	CS2EuropeanaAdapter.prototype.getSubWidgReq_original = function(doc){
		return doc.related_works_orig_number === undefined ? null : sprintf('id:"%s"', doc.related_works_orig_number);													
	};

	/* Request for Multipart work */
	CS2EuropeanaAdapter.prototype.getSubWidgReq_vaerkdele = function(doc){
		if(doc.multi_work_ref === undefined )
			return null;

		/*
		var multi_works = doc.multi_work_ref.split(';-;');						
		var allworksRequest = [];		

		for ( var i = 0, l = multi_works.length; i<l; ++i ) {
			var work = multi_works[i].split(';--;');
			if(work.length > 0)
				allworksRequest.push(sprintf('id:%s', work[1]));	
		}
		var res = allworksRequest.length == 0 ? null : allworksRequest.join(' OR ');

		return res == null ? null : sprintf('%s -id:%s', res, doc.id);
		 */		
		var rootId = this.getValueFromSplit(doc.id.split('/'), 0);
		var partNr = this.getValueFromSplit(doc.id.split('/'), 1); 
		var includeRootId = partNr != null ? sprintf('id:"%s"', rootId) : null;
		return sprintf('id:%s/* -id:"%s" %s', rootId, doc.id, includeRootId);

	};

	/* Request for Related works */
	CS2EuropeanaAdapter.prototype.getSubWidgReq_relatere= function(doc){
		if(doc.related_id === undefined )
			return null;

		var related_works = doc.related_id.split(';-;');						
		var allrelatedRequest = [];

		for ( var i = 0, l = related_works.length; i<l; ++i ) {
			var work = related_works[i].split(';--;');
			if(work.length > 0)
				allrelatedRequest.push(sprintf('id:"%s"', work[1]));	
		}

		return allrelatedRequest.length == 0 ? null : allrelatedRequest.join(' OR ');
	};	

	/**
	 * Media
	 * */
	CS2EuropeanaAdapter.prototype.getMedia_alt = function (doc){	  
		var artist = this.isValidDataText(this.getProducent_producent(doc, this.enumProducent.orig)) ? '' : this.getProducent_producent(doc, this.enumProducent.orig) + ' - ';
		var title = this.getTitle(doc, 'museum');
		var copyright = this.computeCopyright(doc); 

		return  copyright == false ? sprintf('%s%s', artist, title) : sprintf('%s - %s', copyright, title); 	  
	};

	CS2EuropeanaAdapter.prototype.getMedia_image = function (doc, size){	  			
		return doc.medium_image_url;
	};

	CS2EuropeanaAdapter.prototype.getMedia_copyright = function (doc, caller){	  
		var copyright = {};

		copyright.link = caller.manager.translator.getLabel('copyright_link');
		copyright.show = doc.medium_image_url !== undefined && this.computeCopyright(doc);
		copyright.img_cc0 = this.computeCopyright(doc) == false;		
		copyright.text = this.computeCopyright(doc) != false ?	this.computeCopyright(doc).trim() : null;

		return copyright; 	  
	};

	/**
	 * Utils
	 * */
	CS2EuropeanaAdapter.prototype.computeCopyright = function(doc) {
		return doc.copyright !== undefined ? doc.copyright.replace(String.fromCharCode(169), "") : false;
	};

	/**
	 * Enum
	 * */

	CS2EuropeanaAdapter.prototype.enumDepartment = {			
			'kks': 'kks',
			'kms': 'kms',
			'kas': 'kas'
	};

	CS2EuropeanaAdapter.prototype.enumProducent = {			
			'orig': 'original',
			'tilsk': 'tilskrevet',
			'tidl': 'tidl. tilskrevet',
			'vaerksted': 'værksted',
			'efterfoel': 'efterfølger',
			'efter': 'efter',
			'inventor': 'inventor',
			'skole': 'skole',
			'stil': 'stil',
			'kopi': 'kopi efter',
			'efterfor': 'efter forlæg af',
			'udgiver': 'udgiver',
			'trykker': 'trykker',
			'forfatter': 'forfatter/redaktør'								
	};

	CS2EuropeanaAdapter.prototype.enumTitleTypes = {			
			"anden":"anden",
			"auktion":"auktion",
			"beskriv":"beskriv",
			"kunstner":"kunstner",
			"museum":"museum",
			"blank":"museum",
			"oeuvre":"oeuvre",
			"popu":"popu",
			"samler":"samler",
			"serie":"serie",		
			"tidlig":"tidlig",		
			"udstill":"udstill"									
	};
  
  CS2EuropeanaAdapter.prototype.split_1_niv = ";-;";
	CS2EuropeanaAdapter.prototype.split_2_niv = ";--;";
	CS2EuropeanaAdapter.prototype.split_3_niv = ";---;";
	CS2EuropeanaAdapter.prototype.split_4_niv = ";-v;";	
  
  CS2EuropeanaAdapter.prototype.getValueFromSplit = function(splited, index){		
		return splited.length > index && this.isValidDataText(splited[index]) ? splited[index] : null;		
	};
    
  CS2EuropeanaAdapter.prototype.getCurrentLanguage = function() {return "en"};
  
  return CS2EuropeanaAdapter;
    
})();


module.exports = CS2EuropeanaAdapter;