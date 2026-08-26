var $j = window.jQuery;

function updateSpan(url, getStr, updateSpanName, callback) {
	$j('#'+updateSpanName).load(url, getStr, function (response, status, xhr) {
		if(typeof callback == 'function') {
			callback();
		}
	});
}


$j(function() {
	$j('.noscript').hide();

	if (window.customInit)
	{
		customInit();
	}
});

window.addEventListener('DOMContentLoaded', activateFloatingLabels);
window.addEventListener('pageshow', activateFloatingLabels); //to account for BFCache

var lastAdTimestamp;
$j(function() {
	/* initialize lastAdTimestamp when the DOM first loads */
	var d = new Date();
	lastAdTimestamp = d.getTime();
});

function activateFloatingLabels() {
	var containers = document.querySelectorAll('.floatingLabel');
	var inputs = document.querySelectorAll('.floatingLabel input:not([type=hidden]), .floatingLabel textarea');

	inputs.forEach(function(ele, idx) {
		var hasFocus = ele === document.activeElement;
		if(ele.value == '' && containers[idx].classList.contains('isFloating') && !hasFocus){
			containers[idx].classList.remove('isFloating');
		} else if (ele.value != '' || hasFocus){
			containers[idx].classList.add('isFloating');
		}

		ele.addEventListener('focus', function(e) {
			containers[idx].classList.add('hasFocus');
			containers[idx].classList.add('isFloating');
		});
		ele.addEventListener('blur', function(e) {
			containers[idx].classList.remove('hasFocus');
		
			if(e.target.value == '') {
				containers[idx].classList.remove('isFloating');
			}
		});
	})

}

function countLength(event, element, label, count_num)
{
	if(typeof count_num == 'undefined')
	{
		count_num = 250;
	}
	if(element.value.length >= count_num && event)
	{
		element.value = element.value.substr(0, count_num);
		if(event.which != 8 && event.keyCode != 8)
		{
			event.preventDefault();
			event.stop();
		}
	}
	$j('#'+label).html(element.value.length);
}

function moreGames(leaderboard_id, start, amount, category_id, element)
{
	updateSpan('/quizzes/', 'loadmore=1&s='+start+'&a='+amount+'&l='+leaderboard_id+'&c='+category_id+'&href='+document.location.href.replace(/^(?:\/\/|[^\/]+)*\//, ""), element);
}

function formatNumber(number)
{
	number += '';
	if(number.indexOf('.') != -1) {
		number = parseFloat(number).toFixed(2);
	}
	x = number.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1+x2;
}

function formatTime(time) {
	time = Math.round(time);
	var hours = String("00" + (Math.floor(time / 3600))).slice(-2);
	var minutes = String("00" + (Math.floor(time / 60) % 60)).slice(-2);
	var seconds = String("00" + (time % 60)).slice(-2);

	if (hours != '00') {
		return hours+":"+minutes+":"+seconds;
	} else {
		return minutes+":"+seconds;
	}
}

//formats time in seconds to XXh XXm
function formatTimeHoursMins(time) {
	hours = Math.floor(time / 3600);
	time %= 3600;
	minutes = Math.round(time / 60);
	return hours == 0 ? minutes+'m' : hours+'h '+minutes+'m'
}

_spAjaxQueue = function() {
	// Arbitrarily high, currently the most we expect is 13 on the game page for an orange user
	var maxChunkSize = 50;

	var reqList = [];
	return {
		push: function(req) {
			if(typeof req.length == 'undefined') {
				reqList.push(req);
			} else {
				var rlen = req.length;
				for(var i = 0; i < rlen; i++) {
					reqList.push(req[i]);
				}
			}
		},
		send: function() {
			var chunks = [];
			var chunkIndex = 0; // Which chunk we are currently adding to
			var chunkSize = 0;  // How many reqs are in the current chunk
			reqList.forEach(function(req) {
				if (chunkSize >= maxChunkSize) {
					chunkSize = 0;
					chunkIndex++;
				}

				if (chunkIndex >= chunks.length) {
					chunks[chunkIndex] = {};	// Create new chunk of reqs
				}

				// Add req to current chunk
				chunks[chunkIndex][req['ref']] = req;
				chunkSize++;
			});

			chunks.forEach(this.sendChunk, this);
		},
		sendChunk: function(chunk) {
			if (!$j.isEmptyObject(chunk)) {
				var tzo = (new Date()).getTimezoneOffset();

				$j.ajax({
					url: '/ajax/ajaxqueue.php',
					type: 'post',
                    data: "tzo=" + tzo + "&ts=" + Math.floor(Date.now() / 1000) + "&req=" + encodeURIComponent(JSON.stringify(chunk)),
					dataType: 'json'
				}).done(function(data, textstatus, request) {
					$j.each(chunk, function(i,v){
						(v['callback'] || function(){})(data[v['ref']]);
					});
				});
			}
		}
	}
};

function parseAjaxQueueResponse(data) {
	try {
		if (data && data.hasOwnProperty('result')) {
			var result = JSON.parse(data.result);
			if (result) {
				return result;
			}
		}
	} catch (err) {}

	return null;
}

/* Follow */
function followUser(followUserID, showAlert, element, callback) {

	function sendRequest() {
		$j.ajax({
			url: '/ajax/follow_user.php',
			type: 'post',
			data: {
				'follow_user':followUserID
			},
		}).done( function(data) {
			if(callback) {
				callback(data, followUserID, element);
			}
		}).fail(function(xhr, status, error) {
			var res = JSON.parse(xhr.responseText);
			window.showMainPageAlert(res.error, {type: 'danger'});
			if (callback) {
				callback(xhr.responseText, followUserID, element);
			}
		});
	}

	if(showAlert){
		window.SporcleLib.Modal._openConfirmationModal({
			title: 'Unfollow user?',
			message: 'Are you sure you want to unfollow this user?',
			onYes: function (modal) {
				sendRequest();
			}
		});
	} else {
		sendRequest();
	}
}

/* Block */
function blockUser(blockUserID, element, callback) {
	$j.ajax({
		url: '/ajax/block_user.php',
		type: 'post',
		data: {
			'block_user':blockUserID
		}
	}).done( function(data) {
		data = JSON.parse(data);

		var message = data.blocked ? 'This user has been successfully blocked' : (data.unblocked ? 'This user has been successfully unblocked' : '');
		if(message) showMainPageAlert(message, {type: 'success'});

		if(callback) {
			callback(data, blockUserID, element);
		}
	}).fail(function() {
		var data  = {success:false};

		var message = "We encountered an error processing your block request. Please write <a href='/feedback/'>feedback</a> if you continue to experience this issue.";
		showMainPageAlert(message, {type: 'danger'});

		if (callback) {
			callback(data, blockUserID, element);
		}
	});
}

/* Challenge Block */
function challengeBlockUser(blockUserID, element, callback) {
	$j.ajax({
		url: '/ajax/challenge_block_user.php',
		type: 'post',
		data: {
			'block_user':blockUserID
		}
	}).done( function(data) {
		data = JSON.parse(data);

		var message = data.blocked ? 'This user has been successfully blocked from sending you challenges.' : (data.unblocked ? 'This user has been successfully unblocked from sending you challenges.' : '');
		if(message) showMainPageAlert(message, {type: 'success'});

		if(callback) {
			callback(data, blockUserID, element);
		}
	}).fail(function() {
		var data  = {success:false};

		var message = "We encountered an error processing your challenge block request. Please write <a href='/feedback/'>feedback</a> if you continue to experience this issue.";
		showMainPageAlert(message, {type: 'danger'});

		if (callback) {
			callback(data, blockUserID, element);
		}
	});
}

/* Opens a new window to send the given user a message */
function sendUserMessage(recipientHandle, form) {
	var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
	var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

	width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
	height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

	var left = ((width / 2) - (550 / 2)) + dualScreenLeft;
	var top = ((height / 2) - (600 / 4)) + dualScreenTop;
	var windowSizeParam = 'height=600,width=550,top='+top+',left='+left;

	if(recipientHandle){
		$j('<input type="hidden" name="recipient" value="'+recipientHandle+'">').appendTo(form);
	}

	if((form.attr('name')) === 'send-quiz-message'){

		$j('<input type="hidden" name="subject" value="Check out this quiz!">').appendTo(form);

		$j('<input type="hidden" name="message_body">').val("Hey!\n\nI thought you might like this quiz: [" + window.gameNameDesc + "](https://www.sporcle.com" + window.gameurl + "). Let me know what you think! \n\n{{FROM_HANDLE}}").appendTo(form);

		$j('<input type="hidden" name="message_source" value="quiz_page_message_icon">').appendTo(form);

	}

	form.prop("target", "send-message");
	window.open("", "send-message", windowSizeParam);
	form.trigger('submit');
}

/* jQuery plugin to parse the querystring, since jQuery doesn't have one.
adapted from here: http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript */
(function($j) {
	$j.parseQueryString = function() {
		var qs = window.location.search.substr(1).split('&');
		var obj = {};
		for (var i = 0; i < qs.length; ++i) {
			var p = qs[i].split('=');
			if (p.length !== 2) {
				continue;
			}
			obj[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
		}
		return obj;
	};
})(jQuery);

function clickBadgeBookmark(e){
	$j.ajax({
		url: '/ajax/bookmark.php',
		type: 'post',
		data: {bookmark_badge_id: $j(e).attr('id')},
		success: function(data) {
			data = JSON.parse(data);
			if (data.bookmarked) {
				$j(e).addClass('bookmarked');
			} else if (data.unbookmarked) {
				$j(e).removeClass('bookmarked');
			}
		},
		error: function(data) {
			data = JSON.parse(data.responseText);
			showMainPageAlert(data.error, {type:'danger'});
		}
	});
};

function getTitleWithoutCount() {
	return document.title.replace(/^\(\d+\) /,"");
}

function removeCountFromTitle() {
	document.title = getTitleWithoutCount();
}

function addCountToTitle(count) {
	if (parseInt(count) == count) {
		document.title = "("+count+") "+getTitleWithoutCount();
	}
}

function renderMessagesHTML(messages, template) {
	var rendered = [];
	_.each(messages, function(_m) {
		rendered.push(_.template(template)(_m));
	});

	return rendered.join('');
}

function initializeUserBox(result) {
	if (result.user_logged_in) {
		if ('challenge_count' in result) {
			window.updateHeaderChallengeCount(result.challenge_count);
		}

		if ('tournaments_count' in result) {
			window.updateHeaderTournamentsCount(result.tournaments_count);
		}

		if ('florin_count' in result) {
			window.updateHeaderFlorinCount(result.florin_count);
		}

		if ('badges_close_to_earning_count' in result) {
			window.updateHeaderBadgesCloseToEarningCount(result.badges_close_to_earning_count);
		}

		if ('bookmark_count' in result) {
			window.updateHeaderBookmarksCount(result.bookmark_count);
		}

		if ('unplayed_count' in result) {
			window.updateHeaderUnplayedCount(result.unplayed_count);
		}

		window.initStreakBox(result.streak, result.trophy);
	}
}

function showMainPageAlert(msg, options) {
	/* default options
	 type = info
	 dismissible = true;
	 fadeOut = true;
	 */
	window.app = window.app || {};
	app.env = app.env || {};
	clearTimeout(app.env.pageAlertTimer);

	if (typeof options === 'undefined') options = {};

	var $pageAlert = $j('#main-page-alert');
	var $pageAlertWrapper = $j('#main-page-alert-wrapper');

	$pageAlert.html("<span class='alert-icon'></span><span class='alert-message'></span><span class='close-alert'></span>");

	msg = msg.replace('feedback@sporcle.com', '<a target=\"_blank\" href=\"mailto:feedback@sporcle.com\">feedback@sporcle.com</a>');
	$pageAlert.find('.alert-message').html(msg);

	var className = 'alertNeutral';
	if (options.hasOwnProperty('type')) {
		switch (options.type) {
			case 'success':
				className = 'alertGood';
				break;
			case 'danger':
				className = 'alertBad';
				break;
			case 'info':
				className = 'alertNeutral';
				break;
			case 'wait':
				className = 'alertLoading';
				break;
		}
	}
	$pageAlert.removeClass().addClass(className);

	if (!options.hasOwnProperty('dismissible') || options.dismissible) {
		$pageAlert.find('.close-alert').html('&times;').on('click', clearMainPageAlert);
	}

	$pageAlertWrapper.show();

	if (!options.hasOwnProperty('fadeOut') || options.fadeOut) {
		app.env.pageAlertTimer = setTimeout(function() {
			$pageAlertWrapper.fadeOut(600);
		}, 5000);
	}
}

function clearMainPageAlert() {
	window.app = window.app || {};
	app.env = app.env || {};
	clearTimeout(app.env.pageAlertTimer);

	$j('#main-page-alert-wrapper').hide();
	$j('#main-page-alert').removeClass().empty();
}

function copyGame(gameID) {
	window.SporcleLib.Modal._openConfirmationModal({
		title: "Copy Quiz?",
		message: 'Would you like to create a copy of this quiz?',
		onYes: function (remodal) {
			var params = 'game_id='+gameID;
			$j.ajax({url:'/create/copygame.php',
				type: 'post',
				data: params,
				dataType: 'json'
			}).done(function(data) {
				if (data.success) {
					window.location = '/create/edit/'+data.message;
				} else {
					showMainPageAlert(data.message, { type:'danger'});
				}
			});
			remodal.close();
		}
	});
}


$j(function() {
	//Set up suggestion bar events
	setupSuggestionBar();
	setupPromo();
	
	// Set up the click handler for any dropdown-menu-containers
	setupDropdownMenuContainers();
});

function isValidEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}

function setupSuggestionBar(){
	//Attach event listeners to Suggestion Bar
	var sbar = $j('#suggestions-bar');
	$j('#collapse-bar-icon').on('click', function(e){
		var cookieName = 'sb_view_mode';
		var expireTime = 365 * 2; //two years. Hopefully they've accomplished the suggested actions by then

		if(sbar.hasClass('sb-expanded')){
			sbar.addClass('sb-collapsed').removeClass('sb-expanded');
			setCookie(cookieName, 'sb-collapsed', expireTime);
		} else if(sbar.hasClass('sb-collapsed')){
			sbar.addClass('sb-expanded').removeClass('sb-collapsed');
			setCookie(cookieName, 'sb-expanded', expireTime)
		}

	});

	$j('#hide-bar-link').on('click', function () {
		var args = {
			onYes: function (remodal) {
				$j.ajax({
					type: "GET",
					url: "/ajax/user_settings.php",
					data: {hwb: window.userKey},
				}).done(function(response) {
					if(response.success){
						window.location.reload();
					} else {
						showMainPageAlert("Oops, something went wrong. Please refresh and try again.", {type:'danger'});
					}
				}).fail(function(response) {
					response = (response.responseJSON ? response.responseJSON : response);
					if (response.error && typeof(response.error) === 'string' && response.error !== '') {
						showMainPageAlert(response.error, {type:'danger'});
					} else if (response.message && typeof(response.message) === 'string' && response.message !== '') {
						showMainPageAlert(response.message, {type:'danger'});
					} else {
						showMainPageAlert("Oops, something went wrong. Please refresh and try again.", {type:'danger'});
					}
				}).always(function () {

					remodal.close();

				});
			},
			title: 'Hide The Welcome Bar?',
			message: 'Are you sure you want to hide the new user welcome bar?'
		};

		window.SporcleLib.Modal._openConfirmationModal(args);
	});

	if(typeof window.sbData !== 'undefined' && $j('.suggested-action.badge').length){
		$j('.suggested-action.badge').each(function (index, actionElement) {
			var self = $j(actionElement);
			var actionID = (self.attr('id').split('-'))[1];
			var tooltipData = window.sbData[actionID]['tooltip_data'];
			var el = $j(actionElement).find('.suggested-action-progress');
			if(el.length){
				setupSuggestedActionProgressTooltip($j(el), tooltipData,  $j('#suggested-action-tooltip-template'));
			}
		})
	}
}

function setCookie(name,value,days) {
	var expires = "";
	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days*24*60*60*1000));
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function clearCookie(name) {
	document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
}

function compose() {
	var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
	var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

	var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
	var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

	var left = ((width / 2) - (550 / 2)) + dualScreenLeft;
	var top = ((height / 2) - (600 / 4)) + dualScreenTop;
	var windowSizeParam = 'height=600,width=550,top='+top+',left='+left;

	window.open('/messages/new', 'compose', windowSizeParam);
}

function setupSuggestedActionProgressTooltip(element, data, template) {
	var renderedTemplate = _.template(template.html());

	var conditions = Object.keys(data).map(function(id) {
		return data[id];
	}).sort(function (a, b) {
		return a.complete > b.complete ? 1 : -1;
	});

	var tooltipHtml = $j(renderedTemplate({
		conditions: conditions
	}));

	const badgeTooltipOptions = { //this should match /sporcle-ui/tooltips/functionalTooltips
				group                : 'badges',
				target               : true,
				tipJoint             : 'bottom middle',
				showOn               : 'mouseover',
				hideTriggers         : ['target','tip'],
				stemLength           : 8,
				stemBase             : 12,
				hideOn               : 'mouseout',
				removeElementsOnHide : true,
				background           : 'white',
				borderColor          : '#d8d8d8',
				borderWidth          : 1,
				shadowOffset         : [3,3],
				shadowBlur           : 10,
				showEffect           : 'slide',
				showEffectDuration   : 0.1,
				hideEffectDuration   : 0.3,
				className            : 'badge',
				shadowColor          : 'rgba(0,0,0,0.25)'
			};

	var thisOpenTip = new Opentip(element, tooltipHtml.html(), badgeTooltipOptions);
}

function updateSuggestionsBar(actionID, completedConditionID){
	var actionElement = $j('.suggested-action#action-' + actionID);
	if(
		actionElement.length &&
		!actionElement.hasClass('accomplished') &&
		(typeof window.userKey !== 'undefined' || typeof window.userID !== 'undefined') &&
		(typeof window.stopwatch === 'undefined' || !window.stopwatch) &&
		typeof window.sbData !== 'undefined' &&
		window.sbData[actionID] && window.sbData[actionID]['user_conditions_left_per_action']
	){

		var conditionsLeft = window.sbData[actionID]['user_conditions_left_per_action'];

		for( var i = 0; i < conditionsLeft.length; i++){
			if ( conditionsLeft[i] === completedConditionID) {
				conditionsLeft.splice(i, 1);
				break;
			}
		}

		if(!conditionsLeft.length){
			//User just met the last condition. Update suggestion bar UI
			actionElement.css('background', 'url(/images/BGD-Stars.gif) center');
			var newHtmlStrings = generateCompletedActionHTML(window.sbData[actionID]);
			$j('#action-cta-'+ actionID).replaceWith(newHtmlStrings.cta);
			setTimeout(function () {
				actionElement.replaceWith(newHtmlStrings.action);
			}, 2000);

			//See if all the actions are completed
			var completed = 1;
			for (var key in sbData){
				if(sbData[key].hasOwnProperty('user_conditions_left_per_action') && sbData[key]['user_conditions_left_per_action'].length){
					completed = 0;
				}
			}

			if(completed){
				$j.ajax({
					url: '/ajax/log_suggestionbar_completions.php',
					type: 'post',
					data: {
						'completed_all': completed
					}
				})
			}
		}

		window.sbData[actionID]['user_conditions_left_per_action'] = conditionsLeft;
	}
}

//Mimics SuggestionBarAction::getSuggestedActionHtml()
function generateCompletedActionHTML(actionData){
	var actionID = actionData['action_id'];
	var borderClass = actionData['display_order'] < 3 ? 'bordered' : '';
	var actionType = actionData['type'] ? actionData['type'] : '';
	var actionIcon = actionType === 'badge' ? $j('#action-' + actionID + ' .suggested-action-icon').attr('src') : '/images/suggested_actions/icon_success.png';
	var header = actionType === 'badge' ? 'Nice work!' : actionData['accomplished_header'];
	var subheader = actionData['accomplished_subheader'] ? actionData['accomplished_subheader'] : '';
	var cta = actionData['collapse_bar_cta'] ? actionData['collapse_bar_cta'] : actionData['cta'];
	var url = actionData['url'] ? actionData['url'] : '#';
	var iconHtml = "<a href='" + url + "'><img class='suggested-action-icon' src='" + actionIcon + "'></a>";
	var headerHtml = "<div class='action-header'><a href='" + url + "'>" + header + "</a></div>";
	var subheaderHtml = subheader ? "<div class='action-subheader'>" + subheader + "</div>" : '';

	return {
		cta: '<div class="collapse-bar-cta accomplished ' + borderClass + '"><img src="/images/suggested_actions/gray-check.svg"> <a href="#" class="cta-text">' + cta + '</a></div>',
		action: "<div id='action-" + actionData['action_id'] + "' class='suggested-action accomplished " + borderClass + " " + actionType + "'>" + iconHtml + " " + headerHtml +  " " + subheaderHtml + "</div>"
	};
}

//Special logic to update Sampler Platter Suggested Action when they earn the badge without refreshing
function updateSamplerPlatter(categoryID){
	var actionID = typeof window.samplerPlatterActionID !== 'undefined' ? window.samplerPlatterActionID : 3;
	if(
		typeof window.updateSuggestionsBar === 'function' &&
		typeof window.sbData !== 'undefined' &&
		window.sbData[actionID] &&
		(typeof window.userKey !== 'undefined' || typeof window.userID !== 'undefined') &&
		(typeof window.stopwatch === 'undefined' || !window.stopwatch)
	){
		var catConditionMap = window.sbData[actionID]['category_condition_map'];
		var conditionMet = catConditionMap[categoryID];
		var conditionsLeft = window.sbData[actionID]['user_conditions_left_per_action'];

		if(conditionsLeft.indexOf(conditionMet) < 0){
			//Already met this condition, do nothing
			return;
		}

		var newProgressValue = Object.keys(catConditionMap).length - conditionsLeft.length + 1;
		$j('.suggested-action-progress progress').attr('value', newProgressValue);

		if(conditionsLeft.length === 1){
			var lastConditionID = conditionsLeft[0];
			if(catConditionMap[categoryID] == lastConditionID){
				//User just met the last condition for sampler platter badge. Update UI
				updateSuggestionsBar(actionID, lastConditionID);
			}
		} else {
			var tooltipData = window.sbData[actionID]['tooltip_data'];

			tooltipData[conditionMet]['complete'] = 1;
			tooltipData[conditionMet]['condition_earned_date'] = (new Date()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

			var el = $j('#action-' + actionID + ' .suggested-action-progress');
			if(el.length){
				$j(el).unbind(); //Get rid of old toolip
				setupSuggestedActionProgressTooltip($j(el), tooltipData,  $j('#suggested-action-tooltip-template'));
			}
		}
	}
}

//Special logic to update Baby Steps action when they earn the badge without refreshing
function updateBabySteps(){
	var actionID = typeof window.babyStepsActionID !== 'undefined' ? window.babyStepsActionID : 4;
	if(
		typeof window.updateSuggestionsBar === 'function' &&
		typeof window.sbData !== 'undefined' &&
		window.sbData[actionID] &&
		(typeof window.userKey !== 'undefined' || typeof window.userID !== 'undefined') &&
		(typeof window.stopwatch === 'undefined' || !window.stopwatch)
	){
		var progressBar = $j('.suggested-action-progress progress');
		var val = progressBar.val();
		var max = progressBar.attr('max');

		val++;

		$j('.suggested-action-progress progress').attr('value', val);

		if(val == max){
			//User just met the last condition for sampler platter badge. Update UI
			updateSuggestionsBar(actionID, 2415);
		}
	}
}

function jiggleElement(jqueryEl){
	jqueryEl.addClass('wiggly-jiggly').on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e){
		$j(this).delay(200).removeClass('wiggly-jiggly');
	});
}

function setupPromo() {
	if (!window.Sporcle || !window.Sporcle.promotions) {
		return
	}
	
	var promos = window.Sporcle.promotions || {};

	// Clear out expired keys for any promos
	var promoTimestamp;
	var dismissCount;
	var now = Math.floor(Date.now() / 1000);
	Object.keys(promos.keys).forEach(function(key) {
		if (key == 'orange') {
			dismissCount = window.localStorage.getItem(promos.keys['orange']);

			//When we used time for dismiss counts
			if (parseInt(dismissCount) > 1000000000) {
				dismissCount = 1;
				window.localStorage.setItem(promos.keys['orange'], 1);
			}
		} else {
			promoTimestamp = window.localStorage.getItem(promos.keys[key]);
			if (promoTimestamp !== null && parseInt(promoTimestamp, 10) + promos.expire < now) {
				window.localStorage.removeItem(promos.keys[key]);
			}
		}
	});

	// Current promo
	var key = promos.keys[promos.current];
	var showPromo = false;
	var dismissCount = 0;
	if (window.localStorage.getItem(key) === null) {
		showPromo = true;
	} else if (promos.current == 'orange') {
		dismissCount = parseInt(window.localStorage.getItem(key));

		//This could probably be written more concisely, but I wanted the existing rules to be easy to understand
		if (promos.ad_blocking && !promos.logged_in && dismissCount < 5) {
			showPromo = true;
		} else if (promos.ad_blocking && promos.logged_in && dismissCount < 3) {
			showPromo = true;
		} else if (!promos.ad_blocking && !promos.logged_in && dismissCount < 2) {
			showPromo = true;
		} else if (!promos.ad_blocking && promos.logged_in && dismissCount < 1) {
			showPromo = true;
		}
	}

	if (showPromo) {
		var $promo = $j('#adhesion-promo');
		$promo.css('display', 'flex').find('.close').on('click', function() {
			$promo.hide();
			if (promos.current == 'orange') {
				window.localStorage.setItem(key, dismissCount + 1);

			} else {
				window.localStorage.setItem(key, Math.floor(Date.now() / 1000).toString());
			}
		});
	}
}

function toggleAriaExpanded(toggleEl) {
	if ($j(toggleEl).attr('aria-expanded') === 'false') {
			$j(toggleEl).attr('aria-expanded', 'true');
	} else {
		$j(toggleEl).attr('aria-expanded', 'false');
	}
}

/**
 * This is the same as what's in build/includes/sporcle-ui/dropdown-menu/index.js.  Keeping this here until we move main.js to the build directory
 *
 * Set up the click handler that will open/close all dropdown-menu-containers.  In order to work, there needs to be the following structure:
 *
 * <class="dropdown-menu-container">
 *     <class="dropdown-trigger"></>
 *     <class="dropdown-menu">
 *         <class="dropdown-item"></>
 *         <class="dropdown-item"></>
 *     </>
 * </>
 *
 * The elements can be any type of element as long as they have the appropriate classes.
 * The menu will close whenever one of the following three items is clicked on: The trigger element, a dropdown-close element, or a dropdown-item element
 * You do not need dropdown-items inside the menu if the use case doesn't call for it (see the More Info dropdown on the desktop quiz page for an example).
 *
 * Also, when we close all menus, we fire a menus:close event so that if there's anything else that's not a dropdown-menu-container that
 * needs to know to close (like the playlist dropdown on the quiz page), it can listen to this event.
 */
function setupDropdownMenuContainers(options = {}) {
	const closeAllOpenMenus = () => {
		document.querySelectorAll('.dropdown-menu-container.active').forEach(el => {
			el.classList.remove('active');
		})
		window.dispatchEvent(new Event('menus:close'));
	};
	
	const windowMousedownHandler = e => {
		if (e.target.closest('.dropdown-menu-container')) {
			// Clicked inside an element where we don't want to trigger closing other menus, do nothing
			return;
		}

		// Close all dropdowns that are currently open
		closeAllOpenMenus();
	};
	
	const windowClickHandler = e => {
		
		const centerDropdown = options.centerDropdown || false;
		
		const container = e.target.closest('.dropdown-menu-container');
		
		if (container) {
			// Clicked inside a dropdown menu container
			
			const trigger = e.target.closest('.dropdown-trigger');
			const closeBtn = e.target.closest('.dropdown-close');
			const dropdownItem = e.target.closest('.dropdown-item');
			const menu = container.querySelector('.dropdown-menu');

			if (container.classList.contains('active')) {
				// Clicked inside an open menu
				
				if (closeBtn || trigger) {
					// Clicked a button to close the menu
					container.classList.remove('active');
					if (typeof options.onDropdownClose === 'function') {
						options.onDropdownClose($j(menu)); // Expects a jquery object, not a DOM element
					}
					trigger.blur(); // Remove focus so the tooltip goes away if there is one
					return;
				}
				
				if (dropdownItem) {
					// Clicked an item inside a dropdown
					if (!dropdownItem.classList.contains('keep-open')) {
						// Close the menu
						container.classList.remove('active');
						if (typeof options.onDropdownClose === 'function') {
							options.onDropdownClose($j(menu)); // Expects a jquery object, not a DOM element
						}
					}
				}
				
				return;
			}
			
			// Clicked inside a closed menu, should be the trigger element but check to be sure
			if (trigger) {
				// Clicked inside a closed menu trigger, close the others and open it
				closeAllOpenMenus();
				
				if (centerDropdown) {
					// TODO: do we still want to do this?  It's only used in Mobile Web Groups, seems like we should be doing things more consistently
					// Get x offset of trigger button so we can make the mobile dropdown menu fill up the screen a bit more. And center it
					menu.style.top = trigger.offsetHeight;
					menu.style.left = 0 - (trigger.getBoundingClientRect().left - (screen.width - menu.clientWidth)/2);
					menu.style.position = 'absolute';
				}
				
				if (typeof options.onDropdownShow === 'function') {
					options.onDropdownShow($j(menu)); // Expects a jquery object, not a DOM element
				}
				
				container.classList.add('active');
			}
		}
	};
	
	window.addEventListener('mousedown', windowMousedownHandler);
	window.addEventListener('click', windowClickHandler);
}

