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
	$.getJSON(currentCourse + "/roster.json", function (data) {
		names = data;
		console.log("Loaded data", data);
		after();
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

function setupGuesses() {
	picks = pickNames(Object.keys(names));
	$('.face').attr('src', currentCourse + "/" + names[picks['name']].file);
	
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
		console.log('hey', name)
		currentCourse = name;
		window.setTimeout(setSearchString, 100);
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
