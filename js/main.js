"use strict";

function normalizeCourseName(name) {
	name = "" + name;
	name = name.replace(/\s+/g, "");
	name = name.toLocaleLowerCase()
	return name;
}

function setSearchString() {
	window.location.search = currentCourse;
}

function loadClassData(after) {
	after = after || function (){};
	// try to load json data directly
	dirPrefix = currentCourse + "/";
	$.ajax({
		dataType: "json",
		url: dirPrefix + "roster.json", 
		success: function (data) {
				names = data;
				console.log("Loaded data", data);
				after();
			}
	}).fail(function (e) {
		// fall back to local storage
		var dataurl = localStorage.getItem(currentCourse);
		if (dataurl) {
			console.log("Loading from data-url")
			dirPrefix = "";
			pdfProcessor.url = dataurl;
			pdfProcessor.onCompletion = function () {
				setNamesFromProcessedPDF();
				setupGuesses();
			};
			processPDF(pdfProcessor.url);
		} else {
			console.log("Failed to find data-url in localstorage")
		}
	});
}

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

// return an object consisting of a random
// name and a list of random guesses of which
// the name will be one.
function pickNames(names, numGuesses) {
	numGuesses = numGuesses || 5;
	names = shuffle(names.slice());
	var guesses = names.slice(0, numGuesses);
	var name = guesses[0];
	guesses = shuffle(guesses);
	return {name: name, guesses: guesses};
}
var dirPrefix = "";
function setupGuesses() {
	picks = pickNames(Object.keys(names));
	$('.face').attr('src', dirPrefix + names[picks['name']].file);
	
	var elms = $('.name-prompts').find('a');
	for (var i = 0; i < elms.length; i++) {
		$(elms[i]).html(picks['guesses'][i]);
		$(elms[i]).removeClass("highlighted ui-btn-active")
	}
	$('.name-prompt h3').html(picks['name']);
	$('.name-prompt').addClass("hidden");
}






var currentCourse = null, names = {}, picks = {};

$(document).ready(function () {
	if (currentCourse == null && window.location.search) {
		currentCourse = window.location.search.slice(1);
		
		// do other initinalization stuff
		loadClassData(setupGuesses);
	}
	
	$('#select-course').popup({
		popupbeforeposition: function (event, ui) {
			if (currentCourse) {
				$('#select-course-text').val(currentCourse);
			}
		},
		afteropen: function (event, ui) {
			$('#select-course-text').val(currentCourse);
			$('#select-course-text').focus();
		}
	});
	// We want the dialog to show up if there is no search string
	if (!currentCourse) {
		window.setTimeout(function () {$('#select-course-button').trigger("click");console.log("focusing") }, 1000);
	}
	
	
	$('#loadCourse').on("click", function () {
		var name = normalizeCourseName($('#select-course-text').val());
		currentCourse = name;
		
		var file = $('#select-course-pdf')[0].files[0];
		if (file) {
			// if we have a file speficied, assuem it's a pdf file.
			// load it into a dataurl and do the processing!
			var reader = new FileReader;
			reader.addEventListener("load", function () {
				// save the pdf in local storage so we don't have to upload it
				// next time.
				try {
					localStorage.setItem(currentCourse, reader.result);
				} catch (e) {
					// local storage failed
					alert("Cannot save PDF to localstore.  It might be too big, or you might need to clear your local store cache.");
				}
				// process the PDF
				pdfProcessor.url = reader.result;
				pdfProcessor.onCompletion = setNamesFromProcessedPDF;
				processPDF(pdfProcessor.url);
			}, false);
			reader.readAsDataURL(file);
		} else {
			// refresh the page like normal
			window.setTimeout(setSearchString, 100);
		}
	});
	$('#select-course-clear').click(function(){
		$('#select-course-text').val("");
	});
	
	// when a face is clicked, display the next one
	$('#memorize, #quiz').on("click", function (){
		var status = "nohint";
		if ($('.name-prompts').find('.highlighted').length ||
		    !$('.name-prompt').hasClass("hidden")) {
			status = "hint";
		}
		
		switch (status) {
			case "hint":
				setupGuesses();
				break;
			case "nohint":
				var indx = picks['guesses'].indexOf(picks['name']);
				$($('.name-prompts').find('a')[indx]).addClass("highlighted ui-btn ui-btn-active");
				$('.name-prompt').removeClass("hidden")
				break;
		}
	});
	
});
$(document).on("pageshow", function (event) {
});

// global context so we can launch a function when we've done
// our processing
var pdfProcessor = {pagesRemaining: 0, onCompletion: function(){}, objs: []};
function processPDF(filename) {
	if (!window.PDFJS) {
		console.log("Warning, PDFJS isn't loaded");
	}
	
	PDFJS.getDocument({url: filename}).then(function (doc){
		var i;
		pdfProcessor.pagesRemaining = doc.numPages;
		pdfProcessor.objs = [];
		for (i = 1; i <= doc.numPages; i++) {
			doc.getPage(i).then(processPDFPage);
		}
	});

}

function processPDFPage(page) {
	console.log("Processing PDF Page");
	var resources = [];
	
	function processImages (ops) {
		var i = 0, resource_names = [];
		for (i = 0; i < ops.fnArray.length; i++) {
			if (ops.fnArray[i] == PDFJS.OPS.paintJpegXObject) {
				resource_names.push(ops.argsArray[i][0]);
			}
		}
		
		// Now resource_names contains a list of all the image resources
		// we need to fetch.
		for (i = 0; i < resource_names.length; i++) {
			resources.push( {img: page.objs.get(resource_names[i])} );
		}
	}
	
	function processText (txt) {
		txt = txt.items;
		var i = 0, names = [], name, match;
		for (i = 0; i < txt.length; i++) {
			name = txt[i].str;
			match = name.match(/(\w+),(\w+)/);
			if (match) {
				names.push({first: match[2], last: match[1]});
			}
		}
		for (i = 0; i < resources.length; i++) {
			resources[i]['name'] = names[i];
		}
	}
	
	page.getOperatorList().then(function (ops) {
		processImages(ops);
		page.getTextContent().then(function (txt) {
			processText(txt);
			for (var i = 0; i < resources.length; i++) {
				pdfProcessor.objs.push(resources[i]);
			}
			pdfProcessor.pagesRemaining--;
			if (pdfProcessor.pagesRemaining == 0) {
				pdfProcessor.onCompletion(pdfProcessor);
			}
			console.log(resources);
		});
	});
}

function setNamesFromProcessedPDF() {
	var objs = pdfProcessor.objs, name, obj;
	names = {};
	dirPrefix = "";
	for (var i = 0; i < objs.length; i++) {
		obj = objs[i];
		// the PDF is padded with blank pictures to fill out an unfull row
		if (!obj.name) {
			console.log("Warning null object found at index; likely a blank picture", i, obj);
			continue;
		}
		name = obj.name.first + "  " + obj.name.last;
		names[name] = {
			file: obj.img.src,
			name: name,
			first: name.first,
			last: name.last
		}
	}
}