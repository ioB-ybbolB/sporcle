var badgeTooltip = null;
var badgeTooltipRightRail = null;
window.quizBadge = null;
let leaveWarningEnabled = false;

/* Set up event handlers for links on the page
   Not using inline JS as some of these have gotten more complicated with the unverified and not-logged-in cases */
function setupGamePageEventHandlers() {
	$j('#close-message').on('click', function(e) {
		$j('#game-message-box').fadeOut(100);
	});
	
	$j('#average-ratings-button').on('click', function() {
		if (userID === creatorID || hasOrange) {
			window.SporcleLib.Modal.openRatingsBreakdownModal();
		} else {
			window.SporcleLib.Modal.openMemberOnlyModal({
				promoActionText  : 'Viewing the breakdown of ratings',
				registrationPath : 'ratings_breakdown_button_quiz_page'
			});
		}
	});

	if ($j('#comments-section').length) {
		$j('#comment-link').on('click', function(e) {
			const $this = $j(this);
			$j('#comments-section')[0].scrollIntoView();
			$j('#comments-section')[0].focus();
			showComments();
			e.preventDefault();
		});
	}
	
	$j('.bookmark-btn').on('click', bookmarkQuiz);
	
	$j('.rating-globe').on('click', function(e) {
		rateQuiz($j(e.currentTarget).attr('data-rating'));
	});

	$j('#send-user-message').on('click', function() {
		sendUserMessage(creatorHandle, $j('#send-user-message-form'));
	});

	$j('#report-quiz-btn').on('click', function(e) {
	    if(userID && (blockType === "standard")){
	        var message = "Your account has been blocked from reporting quizzes. Contact <a href='/feedback/'>customer support</a> to find out why.";
            showMainPageAlert(message, {type: 'danger'});
        } else if (userID && userVerified) {
			window.SporcleLib.Modal.openReportGameModal({
				form    : gameActive ? 'published' : 'contributed',
				game_id : gameID
			});
		} else if (userID && !userVerified) {
			window.SporcleLib.Modal.openUnverifiedModal({
				promoActionText : 'Reporting quizzes'
			});
		} else {
			window.SporcleLib.Modal.openRegisterModal({
				analyticAction : "Report",
				regPath		   : "quiz_report"
			});
		}
	});

	if ($j('#language-dropdown').length) {
		$j('#language-dropdown').on('change', e => {
			$j.ajax({
				url			: '/games/ajax/set_quiz_langauge.php',
				type		: 'post',
				data		: {
					game_id		: gameID,
					language_id	: e.target.value
				}
			}).done(function(data) {
				if (data.status === 'success') {
					$j('#language-dropdown').val(data.language_id);

					showMainPageAlert('Quiz Language changed successfully', {type: 'success'});
				}
			});
		});
	}

	$j('#editTagsLink').on('click', function() {
		if (blockType === "standard") {
			var message = "Your account has been blocked from editing quizzes. Contact <a href='/feedback/'>customer support</a> to find out why.";
			showMainPageAlert(message, {type: 'danger'});
		} else {
			window.SporcleLib.Modal.openEditTagsModal({
				gid : gameID,
				gameActive : window.gameActive ? window.gameActive : 0,
				savetags : savetags,
				detag : detag,
			});
		}
	});

	$j('#copy-game-btn').on('click', function(e) {
		if (blockType === "standard") {
			showMainPageAlert("Your account has been blocked from creating quizzes. <a href=\"/feedback/\">Contact customer support</a> to find out why.", {
				type:'danger',
				dismissible:true
			});
		} else if (userVerified) {
			copyGame(gameID);
		} else {
			window.SporcleLib.Modal.openUnverifiedModal({
				promoActionText : 'Copying quizzes'
			});
		}
	});

	var context = typeof(resultsPage) !== 'undefined' && resultsPage ? 'Results Page' : 'Game Page';

	$j('#share-game-challenge').on('click', function(e) {
		window.gtag('event', 'Challenge', { location: `Quiz Scoreboard` });
		e.preventDefault();

		var action = 'Challenge';
		checkUserForChallenge(context);
	});

	$j('.fake-link').click(function(event) {
		event.preventDefault();
	});

	$j('#share-game-embed').on('click', function(event) {
		SporcleLib.Modal.openEmbedGameModal({
			encoded_game_id : window.encodedGameID
		});
	});

    $j('#send-quiz-message').on('click', function(event) {
        sendUserMessage(null, $j('#send-quiz-message-form'))
    });

	$j('.random-refresh').on('click', function(event) {
		const $randomQuizLink = $j('#reckoning-random-quiz-link');
		clickReckonBoxRandomRefresh($randomQuizLink.data('subcat-id'), $randomQuizLink.data('category-id'), $randomQuizLink.data('cat-link'));
	});

	$j('.score-controls-btn').on({
		click: function(e) {
			selectScoreSetting($j(e.currentTarget).data('value'));
		},
		keyup: function(e) {
			if (e.keycode === 13) {
				selectScoreSetting($j(e.currentTarget).data('value'));
			}
		},
	});
	
	$j('.timer-controls-btn').on({
		click: function(e) {
			selectTimerSetting($j(e.currentTarget).data('value'));
		},
		keyup: function(e) {
			if (e.keycode === 13) {
				selectTimerSetting($j(e.currentTarget).data('value'));
			}
		},
	});

    $j("#game-message").on('click', '#decline-challenge-from-alert', function(){
    	var encodedId = $j(this).data('encoded-id');
        var ids = [encodedId]; //decline.php expects an array, even if there's just one id

		window.SporcleLib.Modal._openConfirmationModal({
			title: 'Decline Challenge',
			message: 'Are you sure you want to decline and remove this challenge?<br>This cannot be undone.',
			onYes: function (modal) {
                $j.ajax({
                    url: '/challenge/ajax/decline.php',
                    type: 'post',
                    data: {ids:ids},
                    dataType: 'json'
                }).done(function(data) {
                    // Pop up success message.
                    if (data[encodedId]){
                        $j('#game-message').html("You have successfully declined this challenge.");
                        $j('#game-message-box').removeClass().addClass('alertGood').fadeIn(100);
                    } else {
                        $j('#game-message').html("Oops, something went wrong when declining this challenge. Please refresh and try again.");
                        $j('#game-message-box').removeClass().addClass('alertBad').fadeIn(100);
                    }
                }).fail(function(xhr) {
                    var message;
                    if (xhr.responseJSON.hasOwnProperty('message')) {
                        message = xhr.responseJSON.message;
                    } else {
                        message = "Oops, something went wrong when declining this challenge. Please refresh and try again.";
                    }
                    $j('#game-message').html(message);
                    $j('#game-message-box').removeClass().addClass('alertBad').fadeIn(100);
                });
            }
		});
    });
	
	$j('.follow-game-creator').on('click', function(e) {
		if (userID) {
			if (blockType === "standard") {
				var message = "Your account has been blocked from following users. Contact <a href='/feedback/'>customer support</a> to find out why.";
				showMainPageAlert(message, {type: 'danger'});
			} else {
				followUser(creatorIDEncoded, false, null, function(data) {
					if (data.success) {
						updateFollowMenuItem(data.hasOwnProperty('followed') && data.followed);
					}
				});
			}
			
		} else {
			window.SporcleLib.Modal.openRegisterModal({
				analyticAction : "Follow - Game",
				regPath		   : "follow_user_quiz_creator",
				registerAction : function () {
					return function () {
						followUser(creatorIDEncoded, false, null, null);
						window.location.reload();
					};
				}
			});
		}
	});

	$j('#send-kudos:not(.disabled)').on('click', function() {
		window.sendKudos(creatorIDEncoded);
	});
	
	$j('#advanced-stats-promo-signup').on('click', function() {
		window.SporcleLib.Modal.openRegisterModal({
			analyticAction : 'Quiz Page - Advanced Stats',
			regPath        : 'quiz_page_advanced_stats',
		});
	});
	
	$j('#advanced-stats-promo-login').on('click', function() {
		window.SporcleLib.Modal.openLoginModal({
			analyticAction : 'Quiz Page - Advanced Stats',
			regPath        : 'quiz_page_advanced_stats',
		});
	});
}

/* If we have a logged in user, open the challenge modal, otherwise give them a login prompt. */
function checkUserForChallenge(context) {
	if (userID && userVerified) {
		window.SporcleLib.Modal.openChallengeModal(null, {
			gid  : encodedGameID,
			sc   : numRight
		}, {
			done: function() {
				$j.post({
					url: '/games/ajax/check_for_challenge.php',
					data: {
						g: window.gameID
					},
					dataType: "json",
				}).done(function(response) {
					if (response && response.hasOwnProperty('has_open_challenge') && response.has_open_challenge === true) {
						// If you sent a challenge, you can't play in stopwatch mode. We don't currently check if this
						// actually means you have an open challenge.
						disableStopwatch();
						showOpenChallengeMessage({
							encoded_challenge_id : response.encoded_challenge_id,
							opponent_score       : parseInt(response.opponent_score, 10),
							opponent_time        : parseInt(response.opponent_time, 10),
							opponent_handle      : response.opponent_handle,
							opponent_deleted     : response.opponent_deleted,
							answer_count         : parseInt(response.answer_count, 10)
						});
					}
				})

			},
			fail: function(xhr) {
				$j('#challenge-send').show();
				$j('#challenge-ajax-loader').hide();

				var message;
				if (xhr.responseJSON.hasOwnProperty('message')) {
					message = xhr.responseJSON.message;
				} else {
					message = 'Oops, something went wrong when creating your challenge. Please refresh and try again';
				}

				showMainPageAlert(message, {
					type: 'danger',
					dismissible: true
				});
			}
		});
	} else if (userID && !userVerified) {
		window.SporcleLib.Modal.openUnverifiedModal({
			promoActionText : 'Challenging friends'
		});
	} else {
		window.SporcleLib.Modal.openRegisterModal({
			analyticAction : "Challenge - "+context,
			regPath		   : "quiz_challenge_user",
		});
	}
	return false;
}

/* Get the data we're going to need for the post game reckoning */
function buildGetReckoningDataRequest(gameID) {
	$j.ajax({
		url: '/games/ajax/get_data_for_reckoning.php',
		type: 'get',
		data: {
			g   : gameID,
			tzo : (new Date()).getTimezoneOffset(),
		},
		dataType: 'json'
	}).done(function(response) {
		if (response) {
			averageScore = response.hasOwnProperty('averageScore') ? response.averageScore : 0;
			averageFriendScore = response.hasOwnProperty('averageFriendScore') ? response.averageFriendScore : null;
			if (typeof snark !== 'undefined') {
				snark.tiers = response.hasOwnProperty('snarkTiers') ? response.snarkTiers : [];
				snark.text = response.hasOwnProperty('snarkText') ? response.snarkText : {};
			}

			if (typeof reckoningQuestObjective !== 'undefined' && response.questObjective) {
				reckoningQuestObjective = response.questObjective;
			}

			if ($j('#avgPct').length) {
				$j('#avgPct').html(window.roundPercentScore(averageScore) + '%');

				$j('#gameOverMsg').show();
				$j('#reckonMsg').show();
				$j('#distribution-link').show();
			}
			
			if ($j('#avgFriendPct').length) {
				if (averageFriendScore) {
					$j('#avgFriendPct').html(Math.floor(averageFriendScore * 100) + '%');
				} else {
					$j('#avgFriendPct').html('N/A');
				}
			}
			$j('#friendAvg').show();
		}

	}).fail(function(xhr) {
		// Don't do anything at this time.
	});
}

function clickReckonBoxRandomRefresh(encodedSubcatID, encodedCategoryID, catLink) {
		const showPriorityTagGame = !Sporcle.quizLists.priorityGamesFinished,
		gamePriorityTagID = showPriorityTagGame ? Sporcle.gameData.encodedGamePriorityTagID : null,
		excludedIDs = showPriorityTagGame ? Sporcle.quizLists.excludedPriorityQuizzes : null;

	$j.ajax({
		url: '/games/ajax/random_from_vault.php',
		type: 'get',
		data: {
			type : 'reckon_box',
			subcat_id : encodedSubcatID,
			category_id : encodedCategoryID,
			cat_link : catLink,
			priority_tag_id : gamePriorityTagID,
			excluded_game_ids : excludedIDs,
		},
		dataType: 'json'
	}).done(function(response) {
		if (response.success && response.randomGameHTML) {
			$j('#random-quiz-box-wrapper').html(response.randomGameHTML);
		}

		if (response.priorityGamesFinished) {
			window.Sporcle.quizLists.priorityGamesFinished = true;
			return;
		}

		if (response.excludeGameID) {
			window.Sporcle.quizLists.excludedPriorityQuizzes.push(response.excludeGameID);

			if (window.Sporcle.quizLists.excludedPriorityQuizzes.length > 10) {
				window.Sporcle.quizLists.excludedPriorityQuizzes.shift();
			}
		}

	}).fail(function(xhr) {
		// Don't do anything at this time.
	});
}

function updateFollowMenuItem(isFollowing) {
	if (isFollowing) {
		$j('.follow-game-creator').addClass('active');
		$j('.follow-game-creator-text').html(window.ttxt('Following'));
	} else {
		$j('.follow-game-creator').removeClass('active');
		$j('.follow-game-creator-text').html(window.ttxt('Follow'));
	}
}

/* Date format eg 'Sep 17, 2017' */
function getFormattedDate(date = new Date()) {
	const month = date.toLocaleString('default', { month: 'short' });
	const day = date.getDate();
	const year = date.getFullYear();
	return `${month} ${day}, ${year}`;
}

function updateLastPlayedDate() {
	$j('#last-played-date').html(getFormattedDate());
}

/* Get snark based on the percent correct */
function getSnark(userPct) {
	if (typeof snark === 'undefined' || !snark.hasOwnProperty('tiers') || !snark.hasOwnProperty('text')) {
		return '';
	}

	// First figure out the tier
	var tierID = null;
	var tiers = snark.tiers;
	for (var i = 0, len = tiers.length; i < len; i++) {
		if (tiers[i].min === tiers[i].max && userPct === tiers[i].min) {
			tierID = tiers[i].id;
			break;
		} else if (userPct >= tiers[i].min && userPct < tiers[i].max) {
			tierID = tiers[i].id;
			break;
		}
	}
	if (tierID === null) {
		return '';
	}

	// Then get the corresponding snark for that tier
	if (snark.text.hasOwnProperty(tierID)) {
		return formatSnark(snark.text[tierID]);
	} else {
		return '';
	}
}

function formatSnark(snarkText)
{
	return window.SporcleLib.Sitdown.render(snarkText, true);
}

function loggedOutBadgeBookmark() {
	window.SporcleLib.Modal.openRegisterModal({
		analyticAction : 'Join for Free - Badge on quiz page',
		regPath		   : 'quiz_page_badge_bookmark_prompt'
	});
}

function clickBadgeBookmark(e){
	if (blockType === "standard") {
		var message = "Your account has been blocked from bookmarking badges. Contact <a href='/feedback/'>customer support</a> to find out why.";
		showMainPageAlert(message, {type: 'danger'});
	} else {
		$j.ajax({
			url: '/ajax/bookmark.php',
			type: 'post',
			data: {bookmark_badge_id: $j(e).attr('id')},
			success: function (data) {
				data = JSON.parse(data);
				if (data.bookmarked) {
					$j(e).addClass('bookmarked');
					quizBadge.is_bookmarked = true;
				} else if (data.unbookmarked) {
					$j(e).removeClass('bookmarked');
					quizBadge.is_bookmarked = false;
				}
				var conditionsTemp = _.template($j('#badge-conditions-template').html());
				
				quizBadge.tooltip_trigger_id = 'quiz-badge-art';
				var tooltipHtml = $j(conditionsTemp(quizBadge));
				badgeTooltip.content = tooltipHtml.html();

				quizBadge.tooltip_trigger_id = 'quiz-badge-art-right-rail';
				tooltipHtml = $j(conditionsTemp(quizBadge));
				badgeTooltipRightRail.content = tooltipHtml.html();
			},
			error: function (data) {
				data = JSON.parse(data.responseText);
				showMainPageAlert(data.error, {type: 'danger'});
			}
		});
	}
}

function buildPlayedTagRequest(encodedGameID) {
	return {
		ref: 'played_tag',
		request_type: 'GET',
		url: '/ajax/played_quizzes.php',
		params: "games[]="+encodedGameID+"&scores=true",
		callback: function (data) {
			data = parseAjaxQueueResponse(data);
			if (data.played_games[encodedGameID]) {
				updatePlayedTag(data.played_games[encodedGameID]);
			}
		}
	};
}
function updatePlayedTag(playData) {
	var $played = $j('#played-tag');
	if ($played.length && playData.hasOwnProperty('total_score') && playData.hasOwnProperty('best_score')) {
		var userPct = 0;

		if (playData.total_score >= 1) {
			userPct = _.round(playData.best_score/playData.total_score, 2);

			if (userPct === 0 && playData.best_score > 0 ) {
				userPct = 0.01;
			} else if (userPct > 1) {
				userPct = 1;
			}
		}

		userPct = _.round(userPct*100, 0);

		window.bestPercent = userPct;
		let bestTime = '';
		if (userPct == 100 && playData.hasOwnProperty('best_time') && playData.best_time > 0) {
			bestTime = ' - ' + window.formatTime(playData.best_time);
		}

		$played
			.addClass('playedQuiz')
			.html('Best: '+playData.best_score+'/'+playData.total_score+' ('+userPct+'%)' + bestTime)
			.show();
	}
}

function playlistReckoning(playlistData, userPct, updateBestScore) {
	window.Sporcle.gameData.playlist.vm.api.updateQuiz(userPct, (window.Sporcle.gameData.gameTimeSeconds - timerSecs), updateBestScore);
}

/**
 *
 * @param rating
 */
function rateQuiz(rating) {
	if (userID) {
		if (blockType === "standard") {
			const message = "Your account has been blocked from rating quizzes. Contact <a href='/feedback/'>customer support</a> to find out why.";
			showMainPageAlert(message, {type: 'danger'});
		} else if (!userVerified) {
			window.SporcleLib.Modal.openUnverifiedModal({
				promoActionText : 'Rating quizzes'
			});
		} else {
			rateAjaxCall(rating);
		}
	} else {
		window.SporcleLib.Modal.openRegisterModal({
			analyticAction : "Rate",
			regPath		   : "quiz_rate",
			registerAction : function() {
				return function () {
					rateAjaxCall(rating);
					window.location.reload();
				};
			}
		});
	}
}

function rateAjaxCall(rateNum) {
	$j.ajax({
		url: '/games/ajax/rate.php',
		data: {r:rateNum, g:gameID},
		success: function(data) {
			updateRating(data.user_rating, data.average_rating, data.ratings_count);
		},
        error: function (data) {
            if(data.responseJSON && data.responseJSON.message){
                showMainPageAlert(data.responseJSON.message, {type: 'danger'});
            }
        }
	});
}

function updateRating(rating, average, count) {
	if (rating) {
		// User has rated the quiz, update the rating globes
		$j('.globes').addClass('active');
		$j('.rating-globe').each(function(index, element) {
			const $el = $j(element);
			if ($el.attr('data-rating') <= rating) {
				$el.addClass('active');
			} else {
				$el.removeClass('active');
			}
		});
		
	} else {
		$j('.globes, .rating-globe').removeClass('active');
	}
	
	if (average) {
		// Quiz has an average rating, update the rating globes to display the full and partial globes.
		const partialWidth = Number((Math.round((average - Math.floor(average)) * 4) / 4).toFixed(2));
		
		$j('.rating-globe').each(function(index, element) {
			const $el = $j(element);
			const globeNumber = $el.data('rating');
			
			if (globeNumber <= average) {
				$el.find('.empty-globe').css({width: 0});
				$el.find('.full-globe').css({width: '100%'});
			} else if (globeNumber === Math.ceil(average)) {
				$el.find('.empty-globe').css({width: `${(1-partialWidth) * 100}%`});
				$el.find('.full-globe').css({width: `${partialWidth * 100}%`});
			}
		});
	}
	
	$j('#avgRatingNum').html(average);
	$j('#ratingsNum').html('(' + count.toLocaleString() + ')');
}

function bookmarkQuiz() {
	$j('.tooltip-trigger').blur();
    if (userID) {
		if (blockType === "standard") {
			const message = "Your account has been blocked from bookmarking quizzes. Contact <a href='/feedback/'>customer support</a> to find out why.";
			showMainPageAlert(message, {type: 'danger'});
		} else if (!userVerified) {
			window.SporcleLib.Modal.openUnverifiedModal({
				promoActionText : 'Bookmarking quizzes'
			});
		} else {
			bookmarkAjaxCall(encodedGameID, null);
		}
    } else {
        window.SporcleLib.Modal.openRegisterModal({
            analyticAction : "Add Bookmark",
			regPath		   : "quiz_bookmark",
			registerAction : function () {
				return function () {
					bookmarkAjaxCall(encodedGameID, function () {
						window.location.reload();
					});

				}
			}
        });
    }
}

function sendQuizKudos() {
	if (userID) {
		var onYes = () => {
			window.florinAPI.post({
				action     : 'send_quiz_kudos',
				game_id    : encodedGameID,
			}).done(function(response) {
				if (response.transaction_success) {
					window.showMainPageAlert(`Quiz Kudos given!`, {
						type        : 'success',
						dismissible : true
					});
					
					window.updateQuizKudos(true, response.quiz_kudos_count);

					window.updateHeaderFlorinCount(response.new_florin_count);
				} else {
					window.showMainPageAlert('Oops, your quiz kudos transaction failed.', {
						type        : 'error',
						dismissible : true
					});
				}

			}).fail(function(xhr) {
				var message;
				if (xhr.responseJSON.hasOwnProperty('message')) {
					message = xhr.responseJSON.message;
				} else {
					message = 'Oops, something went wrong when giving your Kudos. Please refresh and try again.';
				}

				window.showMainPageAlert(message, {
					type        : 'danger',
					dismissible : true
				});
			});
		}

		window.confirmFlorinPurchaseModal.open({
			onYes,
			modalOptions : {
				purchase_type : 'quiz_kudos',
				game_id       : encodedGameID,
			}
		});

	} else {
		window.SporcleLib.Modal.openRegisterModal({
			analyticAction : "Give Quiz Kudos",
			regPath		   : "quiz_kudos",
		});
	}
}

function bookmarkAjaxCall(encodedGameID, callback) {
	$j.ajax({
		url: '/ajax/bookmark.php',
		type: 'post',
		data: {bookmark_game_id: encodedGameID},
		success: function(data) {
			data = JSON.parse(data);

			updateBookmark(data.hasOwnProperty('bookmarked') && data.bookmarked);

			if (callback) {
				callback();
			}
		},
		error: function(data) {
			data = JSON.parse(data.responseText);
			showMainPageAlert(data.error, {type:'danger'});
		}
	});
}

function updateBookmark(isBookmarked) {
	if (isBookmarked) {
		$j('.bookmark-btn').addClass('active').find('.item-content').html('Bookmarked');
	} else {
		$j('.bookmark-btn').removeClass('active').find('.item-content').html('Bookmark');
	}
}

function updateQuizKudos(isActive, kudosCount) {
	updateQuizKudosSent(isActive);
	updateQuizKudosCount(kudosCount);
}

function updateQuizKudosSent(isSent) {
	if (isSent) {
		$j('.quiz-kudos-btn').addClass('active').off('click', sendQuizKudos);
		$j('#quiz-kudos-container').find('.accessible-tooltip').html('Quiz Kudos Given');
	} else {
		$j('.quiz-kudos-btn').removeClass('active').on('click', sendQuizKudos);;
		$j('#quiz-kudos-container').find('.accessible-tooltip').html('Give Quiz Kudos');
	}
}

function updateQuizKudosCount(kudosCount) {
	$j('#quiz-kudos-container').find('.quiz-kudos-count').html('(' + kudosCount.toLocaleString() + ')');
}

function updateReportButton() {
	$j('#report-quiz-btn').addClass('active disabled').off('click').find('.item-content').html('Reported');
}

/* Comments */
function showComments() {
	if(window.commentsView){
		window.commentsView.actions.showComments();
	}
}

function hideComments(){
	if(window.commentsView){
		window.commentsView.actions.hideComments();
	}
}

/* Tags */
function searchtag(searchbox)
{
	if ($j('#tagsearch').val().length >= 2) {
		updateSpan('/ajax/tagsearch.php', "ts="+encodeURIComponent($j('#tagsearch').val()), 'tagresults');
	} else {
		$j('#tagresults').html("No Results Found");
	}
}
function detag(whichtag)
{
	theTag = this;
	if (!theTag.id)	{
		theTag = whichtag;
	}

	var tagID = $j(theTag).attr('id');
	delete addedTags[tagID];

	if (theTag.className == "tagactive") {
		theTag.className = "tagdeactive";
	} else {
		theTag.className = "tagactive";
	}
}
var addedTags = {};
function addtag(whichtag)
{
	if (!(whichtag.id in addedTags)) {
		var newtagDiv = document.createElement("div");
		newtagDiv.id = whichtag.id;
		newtagDiv.className = "tagactive";
		newtagDiv.innerHTML = whichtag.innerHTML;
		newtagDiv.setAttribute('data-id', whichtag.getAttribute('data-id'));
		newtagDiv.setAttribute('data-subcat', whichtag.getAttribute('data-subcat'));
		newtagDiv.setAttribute('data-can-pick', whichtag.getAttribute('data-can-pick'));
		newtagDiv.setAttribute('data-encodedTagID', whichtag.getAttribute('data-encodedTagID'));
		$j('#utag').append(newtagDiv);
		$j(newtagDiv).on('click', detag);
		addedTags[whichtag.id] = true;
	}
}
function savetags(gameActive)
{
	var savedtags = "";
	var tagsCount = 0;
	var subCatCount = 0;
	var displaytags = [];
	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	$j('.tagactive').each(function(i,e) {
		var tagID = e.getAttribute('data-id');
		var tagNameDisplay = e.innerHTML.trim();
		var tagNameSort = e.id.replace('TID_','').trim();
		var isSubcategory = parseInt(e.getAttribute('data-subcat'), 10) === 1;
		var canPick = parseInt(e.getAttribute('data-can-pick'), 10) === 1;
		var pickTimestamp = e.getAttribute('data-pick-date') ? parseInt(e.getAttribute('data-pick-date'), 10) : null;
		var encodedTagID = e.getAttribute('data-encodedTagID');

		savedtags += e.id + ",";
		tagsCount++;
		if (isSubcategory) {
			subCatCount++;
		}

		if (isSubcategory) {
			// Make sure the gameSubcategories object is up to date
			if (window.gameSubcategories.hasOwnProperty(tagID)) {
				// This subcategory was already attached to the quiz when the page was loaded, update the properties
				// to reflect the most current information.
				window.gameSubcategories[tagID]['can_pick'] = canPick;
				window.gameSubcategories[tagID]['pick_date'] = pickTimestamp || window.gameSubcategories[tagID]['pick_date'];
				window.gameSubcategories[tagID]['tag_name_display'] = tagNameDisplay;
				window.gameSubcategories[tagID]['tag_name_sort'] = tagNameSort;
				window.gameSubcategories[tagID]['encodedTagID'] = encodedTagID;

			} else {
				// This subcategory was added since the quiz page was loaded, either by this user or someone else, or
				// because it was changed to a subcategory.
				window.gameSubcategories[tagID] = {
					can_pick: canPick,
					pick_date: pickTimestamp,
					tag_name_display: tagNameDisplay,
					tag_name_sort: tagNameSort,
					encodedTagID : encodedTagID,
				};
			}

			if (!gameActive && canPick) {
				var pickLink = '';

				if (window.gameSubcategories[tagID]['pick_date']){
					var pickDate = new Date(0);
					pickDate.setUTCSeconds(window.gameSubcategories[tagID]['pick_date']);
					var displayDate = months[pickDate.getMonth()] + ' ' + pickDate.getDate() + ' ' + pickDate.getFullYear();
					pickLink = ` <a class='pick-link' href='/pick-tools/curators/?sc=${window.gameSubcategories[tagID].encodedTagID}&d=${pickDate.getFullYear() + '-' + pickDate.getMonth()}' target='_blank'>${pickDate < new Date() ? "picked" : "scheduled"} ${displayDate}</a>`;

				} else {
					pickLink = ` <a href='/pick-tools/curators?g=${window.encodedGameID}&sc=${window.gameSubcategories[tagID].encodedTagID}' class='makeCuratorPickLink' data-subcat_id=${tagID} target='_blank'>pick</a>`;
				}

				displaytags.push('<div class="tag-wrapper"><a class="subcategory link-button" href="/games/subcategory/'+tagNameSort+'">'+tagNameDisplay+' Quiz</a>'+pickLink+'</div>');

			} else {
				displaytags.push('<div class="tag-wrapper"><a class="tag link-button" href="/games/subcategory/'+tagNameSort+'">'+tagNameDisplay+' Quiz</a></div>');
			}

		} else {
			// This is for regular tags that aren't subcategories.

			// Update the gameSubcategories object just in case this tag used to be a subcategory and no longer is.
			if (window.gameSubcategories.hasOwnProperty(tagID)) {
				delete window.gameSubcategories[tagID];
			}

			displaytags.push('<div class="tag-wrapper"><a class="tag link-button" href="/games/tags/'+tagNameSort+'">'+tagNameDisplay+'</a></div>');
		}
	});

	// Clear out any removed subcategories from the gameSubcategories object
	$j('.tagdeactive').each(function(i,e) {
		var tagID = e.getAttribute('data-id');
		if (window.gameSubcategories.hasOwnProperty(tagID)) {
			delete window.gameSubcategories[tagID];
		}
	});

	if (tagsCount > 12) {
		alert('Please limit your tags to a total of 12 before saving.');
		return;
	} else if (tagsCount < 3 && gameActive) {
		alert('Published quizzes need at least three tags.');
		return;
	} else if (subCatCount < 1 && gameActive) {
		alert('Published quizzes need at least one subcategory tag.');
		return
	}

	$j.post('/ajax/tagset.php', {g:gameID, gts:savedtags});
	$j('#tagList').find('.tag-wrapper').remove();
	$j('#tagList').append(displaytags.join(''));
}

function buildCheckForChallengesRequest(gameID) {
	return {
		ref: 'check_for_challenge',
		url: '/games/ajax/check_for_challenge.php',
		params: "g="+gameID,
		callback: function (data) {
            var response = parseAjaxQueueResponse(data);
            if (response && response.hasOwnProperty('has_open_challenge') && response.has_open_challenge === true) {
				disableStopwatch();
				showOpenChallengeMessage({
					encoded_challenge_id : response.encoded_challenge_id,
					opponent_score       : parseInt(response.opponent_score, 10),
					opponent_time        : parseInt(response.opponent_time, 10),
					opponent_handle      : response.opponent_handle,
					opponent_deleted     : response.opponent_deleted,
					answer_count         : parseInt(response.answer_count, 10)
				});
			}
		}
	};
}

function showOpenChallengeMessage(challengeInfo) {
	window.hasOpenChallenge = true;
	
	// Don't add the message if the quiz has already started and we're on MW
	if (!window.inProgress || !window.mweb) {
		if (window.app && app.config && app.config.components && app.config.components.hasOwnProperty('challenges') && app.config.components.challenges === 0) {
			$j('#game-message').html("You have an open challenge for this quiz; however, challenges are temporarily disabled. If you play the quiz now, it won't count toward your challenge. Please try again in a few minutes.");
			$j('#game-message-box').addClass('alertBad').fadeIn(250);

		} else {
			//challengeInfo.encoded_challenge_id will only be true if there is 1 challenge for this quiz, in which case we'll let the user decline the challenge from the alert bar. If there are many challenges for this user and quiz, the user must decline from his/her challenges page.
			if (challengeInfo.encoded_challenge_id) {
				if (!challengeInfo.opponent_score) {
					$j('#game-message').html('This quiz has an open challenge against <a href="/user/' + challengeInfo.opponent_handle + '">' + challengeInfo.opponent_handle + '</a>. Give it a play or <span id="decline-challenge-from-alert" data-encoded-id=' + challengeInfo.encoded_challenge_id + '>decline this challenge</span>.');
				} else {
					var score = Math.min(challengeInfo.opponent_score, challengeInfo.answer_count);
					var got100 = (score === challengeInfo.answer_count);
					var opponentHandle = challengeInfo.opponent_deleted ? challengeInfo.opponent_handle : '<a href="/user/' + challengeInfo.opponent_handle + '">' + challengeInfo.opponent_handle + '</a>';

					$j('#game-message').html('This quiz has an open challenge against '+opponentHandle+' who got ' + (score + '/' + challengeInfo.answer_count) + (challengeInfo.opponent_time && got100 ? ' in ' + formatTime(challengeInfo.opponent_time) : '')
						+ '. Give it a play or <span id="decline-challenge-from-alert" data-encoded-id=' + challengeInfo.encoded_challenge_id + '>decline this challenge</span>.');
				}
			} else {
				$j('#game-message').html('You have multiple open challenges for this quiz.  Go check out <a href="/challenge/">your challenges</a> to get the details.');
			}

			$j('#game-message-box').addClass('alertNeutral').fadeIn(250);
		}
	}
}

function buildCheckForTournamentsRequest(gameID) {
	return {
		ref: 'check_for_tournament',
		url: '/games/ajax/check_for_tournament.php',
		params: 'g='+gameID,
		callback: function (data) {
			var response = parseAjaxQueueResponse(data);
			
			if (response && response.hasOwnProperty('active_tournaments')) {
				showTournamentPendingMessage(response.active_tournaments);

				$j(window)
					.on('startgame', function() {
						window.addTournamentPopupLeaveWarning();
					})
					.on('endgame', function() {
						window.removeTournamentPopupLeaveWarning();
					});
			}
		}
	}
}

function showTournamentPendingMessage(tournaments) {
	window.isTournamentQuiz = true;
	
	let message = tournaments.length == 1
		? `This is a Tournament quiz! Once you start, it counts. Finish the quiz by ${tournaments[0].end_time}—refreshing mid-quiz means a score of 0.`
		: `This quiz is part of multiple Tournaments you're in! Your score will count for all of them. Once you start, it counts. Refreshing mid-quiz means a score of 0. Check out <a href='/tournaments/'>your tournaments</a> for more details.`;
	
	// Don't add the message if the quiz has already started and we're on MW
	if (!window.inProgress || !window.mweb) {
		addGameMessage(message, 'alertNeutral', 'tournament_message');
	}
	
	if (window.stopwatch) {
	    window.selectTimerSetting('timer', true);
	}

	window.disableStopwatch();
	
	$j('#button-showdown-lower').remove();
	$j('#button-showdown-upper').remove();
	$j('#connect-showdown-container').remove();
	
	if ($j('#pre-quiz-lesson-mode').length) {
		$j('#pre-quiz-lesson-mode').remove();
	}
}

function beforeUnloadHandler(e) {
	if (!leaveWarningEnabled) return;
	
	e.preventDefault();
	e.returnValue = 'You have unsaved changes.';
	return 'You have unsaved changes.';
}

function popStateHandler(e) {
	if (!leaveWarningEnabled) return;
	
	if (!confirm('You have unsaved changes. Continue?')) {
		history.pushState(null, null, window.location.href);
	}
}

function addTournamentPopupLeaveWarning() {
	if (!leaveWarningEnabled) {
		window.addEventListener('beforeunload', beforeUnloadHandler);
		window.addEventListener('popstate', popStateHandler);
	}
	leaveWarningEnabled = true;
}

function removeTournamentPopupLeaveWarning() {
	leaveWarningEnabled = false;
}

// Add an additional game message box. Primarily for the case where there's a tournament message and a challenge one. WIP
function addGameMessage(messageHtml, messageClass, id='') {
	let $existingMessage = id ? $j(`#${id}`) : null;
	
	if ($existingMessage && $existingMessage.length) {
		$existingMessage.removeClass().addClass(`game-message-box ${messageClass}`);
		$existingMessage.children('.alert-message').html(messageHtml);
	} else {
		$existingMessage = $j(`
			<div ${id ? `id="${id}"` : ''} style='display:none;' class='game-message-box ${messageClass}'>
				<div class='alert-icon'></div>
				<div class='alert-message'>${messageHtml}</div>
				<div class='close-message'>&times;</div>
			</div>
		`);
		
		$existingMessage.children('.close-message').on('click', function() {
			$j(this).parent().fadeOut(100);
		})
		
		$j('#game-message-box-container').append($existingMessage);
		
	}
	
	$existingMessage.fadeIn(250);
}

// ----------------------------------------
// Quiz and Showdown Scoreboards
// ----------------------------------------
function loadInitialScoreboardData(scoreboardType) {
	const scoreboardData = window.Sporcle.scoreboards[scoreboardType];
	const $scoreboard = $j('#'+scoreboardType+'-scoreboard');
	
	// Show the stopwatch view on the results page if the last play was a stopwatch play
	if (scoreboardType === 'quiz' && (typeof resultsPage !== 'undefined') && resultsPage && (typeof lastPlayIsStopwatch !== 'undefined') && lastPlayIsStopwatch) {
		scoreboardData.params.mode = 'quizStopwatch';
	}
	updateScoreboard($scoreboard, scoreboardData, function() {
		// Activate all the click handlers in the callback after the initial load is done
		if (scoreboardType === 'quiz') {
			$j('#quiz-scoreboard-show-all').on('click', function(e) {
				scoreboardData.params.all = true;
				updateScoreboard($scoreboard, scoreboardData);
			});

			$j('#quiz-scoreboard-hide-all').on('click', function(e) {
				showCollapsedQuizScoreboard($scoreboard, scoreboardData);
			});
		} else if (scoreboardType === 'showdown') {
			$j('#showdown-scoreboard-show-all').on('click', function(e) {
				scoreboardData.params.all = true;
				updateScoreboard($scoreboard, scoreboardData);
			});

			$j('#showdown-scoreboard-hide-all').on('click', function(e) {
				showCollapsedQuizScoreboard($scoreboard, scoreboardData);
			});
		}
		
		$scoreboard.find('.nav-item').on('click', function() {
			const selectedMode = $j(this).data('mode');
			if (scoreboardData.params.mode !== selectedMode) {
				scoreboardData.params.mode = selectedMode;
				showCollapsedQuizScoreboard($scoreboard, scoreboardData);
			}
		});
	});
}

function showCollapsedQuizScoreboard($scoreboard, scoreboardData) {
	scoreboardData.params.all = false
	updateScoreboard($scoreboard, scoreboardData, function() {
		const top = $scoreboard.find('.section-title').offset().top;
		if (top < window.scrollY) {
			window.scrollTo(0, top);
		}
	});
}

function updateScoreboard($scoreboard, scoreboardData, callback) {
	$scoreboard.find('.nav-item.active').removeClass('active');
	$scoreboard.find('.nav-item[data-mode="'+scoreboardData.params.mode+'"]').addClass('active');
	$scoreboard.find('.hide-all, .show-all').hide();

	if (scoreboardData.cache.hasOwnProperty(scoreboardData.params.mode)) {
		// We already have cached data, no need to make the ajax call
		displayScoreboard(
			$scoreboard,
			scoreboardData.cache[scoreboardData.params.mode],
			scoreboardData.params.mode,
			scoreboardData.params.all
		);

		if (typeof callback === 'function') {
			callback();
		}

	} else {
		// We don't have the data cached, get it from the ajax endpoint
		$j.ajax({
			url    : scoreboardData.endpoints[scoreboardData.params.mode],
			method : 'get',
			data   : scoreboardData.params
		}).always(function() {
			$scoreboard.find('.scoreboard-table').removeClass('loading');
			
		}).done(function(data) {
			sortAndRankScoreboardData(data, scoreboardData.params.mode);
			scoreboardData.cache[scoreboardData.params.mode] = data;

			displayScoreboard(
				$scoreboard,
				scoreboardData.cache[scoreboardData.params.mode],
				scoreboardData.params.mode,
				scoreboardData.params.all
			);

			if (typeof callback === 'function') {
				callback();
			}

		}).fail(function(jqXHR, textStatus, errorThrown) {
			if (jqXHR.readyState === 4) {
				// Request has completely returned (i.e. not interrupted)
				$scoreboard.find('.scoreboard-table').html('<div class="alertBad" style="margin:0 20px">There was an error loading the data.</div>');
			}
		});
	}
}

/**
 * Renders a results/scores table such as the Friends Results or Showdown Top Performers
 *
 * @param {object} $container - jQuery object referencing the DOM element where we want to put the table data
 * @param {object[]} scores - array of scores that we want to render in the table
 * @param {number} numAnswers - number of answers, needed for the best score header label
 * @param {string} mode - what type of scores we're displaying: highscores, stopwatch, or showdown
 * @param {object} user - user metadata, only passed in if we want to display an "unplayed" row in the table
 */
function displayScoresTable($container, scores, numAnswers, mode, user) {

	$container.empty();

	// Determine which templates to use
	let tableTemplate, rowTemplate;
	if (mode === 'quizFriends' || mode === 'quizStopwatch') {
		tableTemplate = $j('#highscores-results-template').html();
		rowTemplate = $j('#highscores-results-row-template').html();
	} else {
		tableTemplate = $j('#showdown-results-template').html();
		rowTemplate = $j('#showdown-results-row-template').html();
	}

	// Append table to element
	const $div = $j('<div>').html(_.template(tableTemplate)({num_answers: numAnswers}));
	const $standingsBody = $div.find('.standings-body');
	
	// Append rows to the table
	for (let i = 0, len = scores.length; i < len; i++) {
		$standingsBody.append(_.template(rowTemplate)({row: scores[i]}));
	}

	let sporcleBot = false;
	_(scores).each(function(score) {
		if (score.user_id == 219890) {
			sporcleBot = true;
		}
	});

	if (scores.length >= 250) {
		$standingsBody.append($j('<tr><td></td><td class="limit-notice" colspan="6">Scoreboard displays your top 250 friend scores</td></tr>'));
	}

	// Add "unplayed" row if user data was supplied
	if (typeof user === 'object') {
		const unplayedRowTemplate = $j('#unplayed-results-row-template').html();
		$standingsBody.prepend(_.template(unplayedRowTemplate)({mode: mode, user: user}));
	}
	
	if (mode === 'showdownAlltime' && scores.length === 0) {
		$standingsBody.append($j('<tr class="no-scores"><td colspan="9"> This quiz has no all-time showdown results yet</td></tr>'));
	}

	$container.html($div);
}

/**
 * Display Scoreboard data.  Figures out which score records to display and if we're displaying an unplayed
 * row before passing the data to the displayScoresTable function.
 *
 * @param {object} $scoreboard - the container for the scoreboard
 * @param {object} data - the friends scores data either from the cached data or the results of the ajax call
 * @param {string} mode - what type of friends scores to display: highscores, stopwatch, or showdown
 * @param {boolean} showAll - flag indicating if we want to display all the scores, or the collapsed version
 */
function displayScoreboard($scoreboard, data, mode, showAll) {
	const collapsedCount = 5;
	let user;

	// Figure out which scores records to display
	let scoresToDisplay = [];
	if (mode === 'showdownAlltime') {
		// Currently for the showdownAlltime scoreboard, we don't do anything special for the user, and don't
		// show an unplayed line or anything like that.
		scoresToDisplay = data.scores;
	} else {
		if (showAll) {
			scoresToDisplay = data.scores;
			if (!data.hasOwnProperty('user_index') && data.hasOwnProperty('user')) {
				// User has not played the quiz, make sure to show the "unplayed" line
				user = data.user;
			}
		} else {
			if (data.hasOwnProperty('user_index')) {
				// User has played the quiz
				if (data.user_index > collapsedCount - 1) {
					// Make sure their data is shown
					scoresToDisplay = data.scores.slice(0, collapsedCount - 1);
					scoresToDisplay.push(data.scores[data.user_index]);
				} else {
					// No need to do anything special
					scoresToDisplay = data.scores.slice(0, collapsedCount);
				}
			} else {
				// User has not played the quiz, make room for the "unplayed" line
				scoresToDisplay = data.scores.slice(0, collapsedCount - 1);
				user = data.user;
			}
		}
	}

	// Update the scores table
	displayScoresTable($scoreboard.find('.scoreboard-table'), scoresToDisplay, data.num_answers, mode, user);

	// Update the count of scores
	const totalCount = data.scores.length;
	const displayCount = scoresToDisplay.length;

	$scoreboard.find('.scores-count').html(totalCount);

	// Update the state of the show/hide buttons
	if (showAll && totalCount > collapsedCount) {
		$scoreboard.find('.hide-all').show();
	} else if (totalCount > displayCount) {
		$scoreboard.find('.show-all').show();
	}
}

/**
 * Given an object with scores data, sorts and ranks the data based on the rules for each mode.  High Scores and
 * Stopwatch are ranked by best score, best time, and user_id.  Showdown is ranked by rating, win count, and user_id.
 * Also figures out the index in the array of the current user, if they have any data.
 *
 * @param {object} data - the object containing the scores data, and where we'll update the user_index
 * @param {string} mode - what type of friends scores to display: friends, stopwatch, or showdown
 */
function sortAndRankScoreboardData(data, mode) {
	let comparator;
	if (mode === 'quizFriends' || mode === 'quizStopwatch') {
		// regular or stopwatch
		comparator = function(a, b) {
			// b first does desc, a first does asc
			return b.best_score_num - a.best_score_num || a.best_time - b.best_time || a.user_id - b.user_id;
		};
	} else {
		// showdown
		comparator = function(a, b) {
			// b first does desc, a first does asc
			return b.rating - a.rating || b.win_count - a.win_count || a.user_id - b.user_id;
		};
	}

	data.scores.sort(comparator);

	rankSortedArrayOfObjects(data.scores, ['best_score_num', 'best_time']);

	for (var i = 0, len = data.scores.length; i < len; i++) {
		if (window.userID === data.scores[i].user_id) {
			data.user_index = i;
		}
	}
}

/**
 * Determine if two objects have the same values for a set of properties
 *
 * @param {object} obj1 - First object to compare
 * @param {object} obj2 - Seconds object to compare
 * @param {string[]} properties - array of property names that we want to compare
 * @returns {boolean}
 */
function objectsHaveMatchingValues(obj1, obj2, properties) {
	for (var i = 0, len = properties.length; i < len; i++) {
		var prop = properties[i];
		if (!obj1.hasOwnProperty(prop) || !obj2.hasOwnProperty(prop) || obj1[prop] !== obj2[prop]) {
			return false;
		}
	}

	return true;
}

/**
 * Rank a sorted array of objects based on comparing the properties passed in via the properties array
 *
 * @param {object[]} array - sorted array of objects that we want to assign ranks to
 * @param {string[]} properties - array of property names that we want to compare
 */
function rankSortedArrayOfObjects(array, properties) {
	var rank = 0;
	var rankCount = 0;
	var previousValues = {};

	array.forEach(function(currentValues){
		if (rank === 0) {
			// First element in the array is always ranked 1
			rank = 1;
			rankCount = 1;

		} else if (objectsHaveMatchingValues(currentValues, previousValues, properties)) {
			// All properties have matching values, rank doesn't change but the count of scores with this rank changes.
			rankCount++;

		} else {
			// New values, so increment the rank and reset the rank count.
			rank += rankCount;
			rankCount = 1;
		}

		currentValues.rank = rank;
		previousValues = currentValues;
	});
}

//Redefined from main.js, so mobile web has access
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

/**
 *
 * @param {string} mode
 * @param {number} score
 * @param {number} time
 */
function addPlayToFriendScoresCache(mode, score, time) {
	var userFound = false;
	var numAnswers = window.answers.length;

	if (window.pinpoint) {
		numAnswers *= 100;
	}

	var cache = window.Sporcle.scoreboards.quiz.cache[mode];

	for (var i = 0, len = cache.scores.length; i < len; i++) {
		// Update the user's element in the scores array.
		var element = cache.scores[i];
		if (window.userID === element.user_id) {
			userFound = true;

			element.play_count++;
			element.play_date = window.loadTimeString;

			if (score > element.best_score_num) {
				element.best_score_num = score;
				element.best_score = numAnswers ? score/numAnswers : 0;
			}

			if (score === numAnswers && (element.best_time === null || element.best_time > time)) {
				element.best_time = time;
				element.best_time_string = formatTime(time);
			}
		}
	}

	if (!userFound) {
		// Add an element to the scores array
		cache.scores.push({
			best_score : numAnswers ? score/numAnswers : 0,
			best_score_num : score,
			best_time : score === numAnswers ? time : null,
			best_time_string : score === numAnswers ? formatTime(time) : "",
			handle : cache.user.handle,
			image : cache.user.image,
			is_current_user : true,
			play_count : 1,
			play_date : window.loadTimeString,
			rank : 0,
			flair_id : cache.user.flair_id,
			user_id : window.userID
		});
	}

	sortAndRankScoreboardData(cache, mode);

	return cache;
}

/**
 *
 * @param {object} plays
 */
function addShowdownPlaysToFriendScoresCache(plays, botMatch) {
	var mode = 'showdown';
	var numAnswers = window.answers.length;
	var cache = window.Sporcle.scoreboards.showdown.cache.showdownFriends;
	var play;

	var RESULT_WIN = 2;
	var RESULT_LOSS = 0;
	var RESULT_TIE = 1;

	for (var i = 0, len = cache.scores.length; i < len; i++) {
		// Update the user's element in the scores array.
		var element = cache.scores[i];
		if (plays.hasOwnProperty(element.user_id)) {
			play = plays[element.user_id];

			if (play.result === RESULT_WIN) {
				element.win_count++;
			} else if (play.result === RESULT_LOSS) {
				element.loss_count++;
			} else if (play.result === RESULT_TIE) {
				element.tie_count++;
			}

			element.play_date = window.loadTimeString;

			if (play.score > element.best_score_num) {
				element.best_score_num = play.score;
				element.best_score = numAnswers ? play.score/numAnswers : 0;
			}

			if (play.score === numAnswers && (element.best_time === null || element.best_time >  play.time)) {
				element.best_time =  play.time;
				element.best_time_string = formatTime( play.time);
			}

			if (botMatch && !element.rating) {
				element.rating = '-';
			} else {
				element.rating = play.rating ? play.rating : '-';
			}

			delete plays[element.user_id];

			if (Object.keys(plays).length === 0) {
				break;
			}
		}
	}

	// For any plays that didn't match an element in the array, add it if it belongs to the user or one of their friends
	for (var playerID in plays) {
		playerID = parseInt(playerID, 10);
		if (playerID === window.userID || cache.friends.includes(playerID)) {
			play = plays[playerID];

			cache.scores.push({
				best_score : numAnswers ? play.score/numAnswers : 0,
				best_score_num : play.score,
				best_time : play.score === numAnswers ? play.time : null,
				best_time_string : play.score === numAnswers ? formatTime(play.time) : "",
				handle : play.handle,
				image : play.image,
				is_current_user : playerID === window.userID,
				win_count : play.result === RESULT_WIN ? 1 : 0,
				loss_count : play.result === RESULT_LOSS ? 1 : 0,
				tie_count : play.result === RESULT_TIE ? 1 : 0,
				play_date : window.loadTimeString,
				rank : 0,
				rating : play.rating,
				flair_id : play.flair_id,
				user_id : userID
			});
		}
	}

	sortAndRankScoreboardData(cache, mode);
}