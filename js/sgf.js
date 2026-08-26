var stop = false;
var mweb = mweb || 0;
var giveUpDelay = 0;
var gameTimer;
var startTime;
var origSecs;
var origQuizTime;
var timerSecs;
var pausedTime = 0;
var pausedStartTime;
var overrideSecs = -1;
var timerCorrection;
var inProgress = false;
var didGiveUp = false;
var stopwatch = false;
var scoreAsPercentage = false;
var numRight = 0;
var currDisplayScore = 0;
var oldTime = null;
var delayCount = 0;
var isTournamentQuiz = false;
const JUST_GO_PLAY_THRESHOLD = 15;

$j(function () {
	oldTime = $j('#time').html().trim();
});

function selectTimerSetting(selection, isShowdown) {
	const isSporcleAppView = (window._payload || {}).is_flagship_app_view;

	if (selection == 'stopwatch' && !userID) {
		window.SporcleLib.Modal.openRegisterModal({
			regPath        : 'quiz_page_practice_mode',
			analyticAction : 'Quiz Page - Practice Mode',
		});
		return;
	}
	
	let timeEl = mweb ? $j('#reckoning-time') : $j('#time');

	if (inProgress) {
		return;
	}

	if (typeof isShowdown === 'undefined') {
		isShowdown = false;
	}

	$j('#time-box-dropdown-menu button').each(function(index, element) {
		const $el = $j(element);
		if ($el.data('value') === selection) {
			$el.addClass('active');
		} else {
			$el.removeClass('active');
		}
	});

	// Only do the things if the mode actually changes
	if (selection === 'timer' && stopwatch) {
		stopwatch = false;
		timeEl.html(oldTime);

		if (!mweb) {
			$j('#timeBox .dropdown-trigger').html('Timer');
			$j('#timeBox #practice-mode-container').addClass('disabled');
		}

		$j('#timeBox, #scoreBox, #upTime').removeClass('timePast');
		
		if (userID) {
			if (isShowdown) {
				$j('#share-game-challenge').addClass('disabled');
				window.Sporcle.scoreboards.showdown.params.mode = 'showdownFriends';
				showCollapsedQuizScoreboard($j('#showdown-scoreboard'), window.Sporcle.scoreboards.showdown);
			} else {
				window.Sporcle.scoreboards.quiz.params.mode = 'quizFriends';
				showCollapsedQuizScoreboard($j('#quiz-scoreboard'), window.Sporcle.scoreboards.quiz);
			}
		}

		if (isSporcleAppView && Sporcle.gameData.quizHelpers) {
			if (!Sporcle.gameData.quizHelpers.filter(qh => qh.id !== 'the-extender').length) {
				$j('#quiz-helpers-open').show();
			}
		}
	} else if (selection === 'stopwatch' && !stopwatch) {
		stopwatch = true;
		timeEl.html('00:00');

		if (!mweb) {
			$j('#timeBox .dropdown-trigger').html('Practice Mode');
			$j('#timeBox #practice-mode-container').removeClass('disabled');
		}

		$j('#share-game-challenge').addClass('disabled');
		$j('#timeBox, #scoreBox, #upTime').addClass('timePast');
		
		if (userID) {
			window.Sporcle.scoreboards.quiz.params.mode = 'quizStopwatch';
			showCollapsedQuizScoreboard($j('#quiz-scoreboard'), window.Sporcle.scoreboards.quiz);
		}

		if (isSporcleAppView && Sporcle.gameData.quizHelpers) {
			if (!Sporcle.gameData.quizHelpers.filter(qh => qh.id !== 'the-extender').length) {
				$j('#quiz-helpers-open').hide();
			}
		}
	}
}

function selectScoreSetting(selection) {
	if (!window.userID) {
		window.SporcleLib.Modal.openRegisterModal({
			regPath        : 'quiz_page_score_settings',
			analyticAction : 'Quiz Page - Score Settings',
		});
		return;
	}
	
	$j('#score-box-dropdown-menu button').each(function(index, element) {
		const $el = $j(element);
		if ($el.data('value') === selection) {
			$el.addClass('active');
		} else {
			$el.removeClass('active');
		}
	});

	scoreAsPercentage = (selection === 'percentage');

	displayScore();
}

function startTimer() {
	timerSecs = stopwatch ? 0 : origSecs;
	startTime = new Date().getTime();
	gameTimer = setTimeout(redo, 1000);

	$j('#time-progress').css({
		'animation-duration' : `${origSecs * 1000}ms`,
		'animation-play-state' : stopwatch ? 'paused' : 'running'
	});
}

function displayScore(numCorrect, showMax = true) {
	const isSporcleAppView = (window._payload || {}).is_flagship_app_view;

	// if (isSporcleAppView) {
	// 	window.SporcleApp.api.playHaptic('soft');
	// }

	if (typeof numCorrect === 'undefined') {
		numCorrect = currDisplayScore;
	} else {
		currDisplayScore = numCorrect;
	}

	let maxScore = answers.length;

	if (window.pinpoint) {
		maxScore = maxScore * 100;
	}

	var score;
	if (scoreAsPercentage) {
        var userPct = _.round((numCorrect/maxScore), 2);
		score = _.round(100 * userPct) + '%';
	} else {
		if (showMax) {
			score = numCorrect + "/" + maxScore;

			if (mweb) {
				score = numCorrect + " / " + maxScore;
			}
		} else {
			score = numCorrect;
		}
	}

	$j('.correctnum').text(numCorrect);
	$j('#scoreBox .currentScore').text(score);
}

function displayTime(totalSecs) {
	var min = Math.floor(totalSecs/60);
	var sec = totalSecs%60;
	return (min<10?"0":"")+min+":"+(sec<10?"0":"")+sec;
}

function endGame()  {
	if (!inProgress) return;

	inProgress = false;

	clearTimeout(gameTimer);
	
	// Defer this block to reduce INP
	window.setTimeout(async function() {
		showMissed();
		
		if (window.Sporcle.postQuizAnimation) {
			await window.Sporcle.postQuizAnimation;
		}
		
		$j(window).trigger('endgame');
		$j('body').removeClass('active').addClass('over');
		
		callSPHooks('end');
		
	}, 0);
}

function giveUp() {
	didGiveUp = true;
	logPlay();
	endGame();

	if (typeof gameID !== 'undefined') {
		$j.get('/games/includes/event.php', {
			g: gameID,
			mw: mweb,
			sw: stopwatch ? 1 : 0,
			a: 'gu'
		});
	}
}

function addGiveUp() {
	const $giveUp = $j('#giveUp');
	$giveUp.prop('disabled', false)
	$giveUp.one('click', giveUp);
	$giveUp.show();
}

async function redo() {
	if (stop || didGiveUp) {
		return;
	}

	timerSecs += stopwatch ? 1 : -1;

	if (stopwatch) {
		if (timerSecs == giveUpDelay) {
			addGiveUp();
		}
	} else {
		if ((origSecs - timerSecs) == giveUpDelay) {
			addGiveUp();
		}

		if (timerSecs == 10) {
			$j('#timeBox').addClass('timeTicking');
		}
	}

	// Pinpoint quizzes have a delay to show the scoring radius. Crossover quizzes also have a delay. We don't want these checks to cut this short
	if (!window.pinpoint && !window.crossover) {
		if (guessesRemaining == 0) {
			/* Process the end of a click box or picture click game where they ran out of guesses (regardless if they got them all right) */
			logPlay();
			endGame();
	
			return;
		}
	
		if (inProgress && endOnAllCorrect && found.length == answers.length) {
			/* Process the end of normal game where they got them all right before the time ran out */
			logPlay();
			endGame();
			return;
		}
	}

	$j('#time').html(displayTime(timerSecs));
	
	restoreFocus();

	if (timerSecs == 5999) {
		// End the game if the timer ever hits 99:59. This is for stopwatch
		logPlay();
		endGame();
		return;
	}

	if (stopwatch) {
		if (timerSecs == origSecs) {
			/* They ran out of time, log a timer play but keep counting up */
			logTimerPlay();

			$j.get('/games/includes/event.php', {g:gameID, mw:mweb, sw:stopwatch?1:0, a:'av'});
		}
		timerCorrection = (new Date().getTime() - (startTime+pausedTime)) - (timerSecs*1000);
		gameTimer = setTimeout(redo, 1000-timerCorrection);
	} else {
		if (timerSecs == 0) {
			$j('#time-progress').css({
				'animation-play-state' : 'paused'
			});

			let showAddTime = true;
			let timeToAdd;

			if (origQuizTime < 60) {
				timeToAdd = 15; // 15 seconds
			} else if (origQuizTime < 240) {
				timeToAdd = 30; // 30 seconds
			} else {
				timeToAdd = 60; // 60 seconds
			}

			if (window.orderup && window.orderup.choices.every((choice, index) => choice.data === window.orderup.correct[index].data)) {
				showAddTime = false; // Don't show add time modal if they got everything right in order up
			}

			if (showAddTime && window.addTime && await window.addTime(timeToAdd)) {
				doAddTime(timeToAdd);

				pausedTime = (new Date().getTime() - startTime) - ((origSecs-timerSecs)*1000);
				timerCorrection = 0;

				return;
			}

			/* Process the end of any game where they ran out of time */
			logPlay();
			endGame();
			return;
		} else {
			/* Restart the timer */
			timerCorrection = (new Date().getTime() - (startTime+pausedTime)) - ((origSecs-timerSecs)*1000);
			gameTimer = setTimeout(redo, (1000 - timerCorrection));
		}
	}
}

function doAddTime(timeToAdd = 60) {
	timerSecs += timeToAdd;
	origSecs += timeToAdd;

	let animationProgress = (origSecs - timerSecs) / origSecs;

	$j('#time').html(displayTime(timerSecs));
	$j('#timeBox').removeClass('timeTicking');

	// All this just resets the animation to prevent it being buggy
	$j('#time-progress').css('animation', 'none').height();

	$j('#time-progress').css({
		'animation-name': 'time-progress-bar',
		'animation-timing-function': 'linear',
		'animation-fill-mode': 'forwards',
		'animation-play-state': 'paused'
	});

	$j('#time-progress').css({
		'animation-duration' : `${origSecs * 1000}ms`,
		'animation-play-state' : 'running',
		'animation-delay' : `-${origSecs * animationProgress}s`
	});
}

function getLogData() {
	var ls = getLogStrings();
	ls.logString = ls.logString || '';
	ls.logBonusString = ls.logBonusString || '';

	var logTime = stopwatch ? timerSecs : origSecs-timerSecs;

	// Get homepage tracking data. Then clear it, we only want to log this on he very first play coming from the homepage
	let homepageTrackingPayload = {};
	if (window.homepageTracking) { // This should be getting set, but don't want to break if it's not
		homepageTrackingPayload = window.homepageTracking.getTrackingDataLogResultsPayload();
		window.homepageTracking.clearTrackingData();
	} else {
		console.error('Homepage tracking not found');
	}
	
	var logData = {
		g       : gameID,
		a       : ls.logString,
		t       : logTime,
		b       : ls.logBonusString,
		tzo     : (new Date()).getTimezoneOffset(),
		es      : Sporcle.embedSiteID,
		ep      : Sporcle.embedPartnerID,
		pl      : window.sessionStorage.getItem('playlistID'),
		ho      : typeof hasOrange !== 'undefined' ? hasOrange : 0,
		hpm     : typeof hasMembership !== 'undefined' ? hasMembership : 0,
		ldtm    : loadTime,
		avg_pct : typeof averageScore !== 'undefined' ? averageScore : 0,
		qs      : typeof qScores !== 'undefined' ? qScores : {},
		ssr     : window.Sporcle.gameData.subsetRows.join(','),

		// Tracking keys for the homepage
		...homepageTrackingPayload,
	};

	if (isEmbed) {
		if (typeof spuid != 'undefined' && spuid) logData.spuid = spuid;
	}

	return logData;
}

function logPlay() {
	trackJustGo();

	if (showdownActive) {
		return;
	}

	if (stopwatch) {
		logTimerPlay();
		logStopwatchPlay();
	} else {
		logTimerPlay();
	}

	return;
}


// Helper functions for "JustGo" mtc variable
function trackJustGo() {
	// Only for logged out users
	if (typeof userKey !== 'undefined') {
		return;
	}
	
	let playCount = getJustGoCount();
	playCount++;
	window.localStorage.setItem('justGoPlayCount', playCount);

	const params = new URLSearchParams(window.location.search);

	if ((playCount > 0 && playCount % JUST_GO_PLAY_THRESHOLD === 0) || params.has('justgo')) {
		triggerJustGo();
	}
}

function getJustGoCount() {
	let playCount = 0;
	
	// Only fetch the value if the user is not logged in
	if (window.localStorage && typeof userKey === 'undefined') {
		playCount = parseInt(window.localStorage.getItem('justGoPlayCount')) || 0;
	}
	
	return playCount;
}

// Check the user's JustGo play count and trigger JustGo if it's 20
function checkJustGo() {
	const count = getJustGoCount();
	if (count > 0 && count % JUST_GO_PLAY_THRESHOLD === 0) {
		triggerJustGo();
	}
}

// Set the window variable and post an event for MTC to pick up
function triggerJustGo() {
	window.JustGo = true;
	window.top.postMessage(
		{ source: "JustGo", message: true},
		"*"
	);
}


function logTimerPlay() {
	// This is so postLog waits for us to get a response back from log_results before attempting to do postLog stuff
	var deferredData = $j.Deferred();
	postLog = postLog.bind(null, deferredData);

	var logData = getLogData();
	logData.swm = stopwatch ? 1 : 0;
	logData.nur = typeof newUserRecommended !== 'undefined' && newUserRecommended ? 1 : 0;

	$j.get("/games/log_results.php", logData, function(data) {
		deferredData.resolve(data);
		
		if (data.tracked_tournaments && data.tracked_tournaments.length) {
			let message = data.tracked_tournaments.length > 1
			? `Your score has been recorded for all the tournaments this quiz is in. See how you stack up in <a href='/tournaments/'>your tournaments</a>.`
			: `Your play is locked in — you’re #${data.tracked_tournaments[0].current_rank} out of ${data.tracked_tournaments[0].player_count} so far today. Check your progress on the <a href='/tournaments/${data.tracked_tournaments[0].encoded_tournament_id}'>Tournament Leaderboard</a>.`;
			
			// Modal disabled for now
			// window.SporcleLib.Modal.openTournamentPostQuizModal();
			window.addGameMessage(message, 'alertGood', 'tournament_message');
		}
		
        if (data.play_is_valid && typeof userKey !== 'undefined' && !data.anonymized_play) {
            window.updatePlayStreak();
        }

        if (data.play_is_valid && typeof gameID !== 'undefined') {
            var user = typeof userKey !== 'undefined' && userKey ? userKey : (typeof spuid !== 'undefined' && spuid ? spuid : false);

            if (typeof window.sbData !== 'undefined') {

                if (
                    typeof sbData[2] !== 'undefined' &&
                    typeof sbData[2]['playlist_game_ids'] !== 'undefined' &&
                    sbData[2]['playlist_game_ids'].indexOf(gameID) >= 0
                ) {
                    updateSuggestionsBar(2, 1);
                }

                if (typeof gameCategoryID !== 'undefined' && typeof updateSamplerPlatter === 'function') {
                    updateSamplerPlatter(gameCategoryID);
                }

                if (
                    typeof window.sbData['update_baby_steps_on_play'] !== 'undefined' &&
                    window.sbData['update_baby_steps_on_play'] &&
                    typeof updateBabySteps === 'function'
                ) {
                    updateBabySteps();
                }
            }
        }
	});

	// We only log a timer play once, so short circuit any future calls
	logTimerPlay = function(){};
	
	if (window.Sporcle.sendEmbedQuizEvents) {
		// Basing the correct answer count on the logString because we don't update numRight on some quiz types until the showMissed() function
		const correct = (logData.a.match(/1/g)||[]).length;
		const answers = window.answers.length;
		const time = window.origSecs-window.timerSecs;
		
		let cause = 'completed_quiz';
		if (timerSecs === 0) {
			cause = 'timed_out';
		} else if (didGiveUp) {
			cause = 'gave_up';
		} else if (_spks && correct !== answers) {
			cause = 'hit_mine';
		}
		
		const msg = {
			source         : 'sporcle',
			event          : 'end',
			end_cause      : cause,
			correct_count  : correct,
			question_count : answers,
			time           : time,
		};
		window.parent.postMessage(msg, '*');
	}
}

function logStopwatchPlay() {
	var logData = getLogData();

	logData.sw = 1;
	logData.swm = stopwatch ? 1 : 0;

	$j.get("/games/log_results.php", logData, function (data) {
        if (data.play_is_valid && typeof userKey !== 'undefined' && !data.anonymized_play) {
            window.updatePlayStreak();
        }
    });

	// We only log a stopwatch play once, so short circuit any future calls
	logStopwatchPlay = function(){};
}

function runFinished() {
	$j('#giveUp:not(.button-primary)').hide();
	$j('#pauseBox').css({visibility:'hidden'});
	postLog();
}

function postLog(deferredData) {
	if (typeof deferredData === 'object') {
		// This means it is a normal play, and we are waiting for the call to log_results to finish
		$j.when(deferredData).done(function(data) {
			$j(window).trigger('postLog');

			var completedChallengeCount = 0;
			var height = 270;
			var userPct = 0;

			if (answers.length >= 1) {
				userPct = _.round(window.numRight/answers.length, 2);

				if (window.pinpoint && window.qScores) {
					let score = Object.values(qScores).reduce((a, cv) => {
						return a + cv;
					}, 0);
					userPct = _.round(score/(answers.length * 100), 2);
				}

				if (userPct === 0 && window.numRight > 0 ) {
					userPct = 0.01;
				} else if (userPct > 1) {
					userPct = 1;
				}
			}

			if (data.hasOwnProperty('challenge_status') && data.challenge_status.logged_in) {
				challenge = data.challenge_status;

				completedChallengeCount = challenge.record.wins + challenge.record.losses + challenge.record.ties;

				if (!challenge.rollup) {
					height += 50 * completedChallengeCount;
				}

				if (challenge.met > 0 && completedChallengeCount === 0) {
					$j('#game-message').html('<a href="/challenge/pending/">Challenge met!</a>');
					$j('#game-message-box').attr('class', 'alertNeutral').fadeIn({duration: 0.25});
				}
			}

			if (completedChallengeCount > 0) {
				$j('#game-message-box').hide();

				if (!window._payload.is_flagship_app_view) {
					window.SporcleLib.Modal.openPostChallengeModal({
						results : data.challenge_status,
						gid     : gameID
					});
				} else {
					let userPctCopy = userPct; // a copy is needed to prevent the value from changing during the 50ms timeout

					window.SporcleLib.Modal.openPostChallengeModal({
						results : data.challenge_status,
						gid     : gameID,
						onClose : () => {
							setTimeout(() => {
								openFlagshipPostGameModal(userPctCopy);
							}, 50);
						}
					});
				}
			} else if (window._payload?.is_flagship_app_view) {
				openFlagshipPostGameModal(userPct);
			}

			if (!isEmbed) {
				if (window.userID && window.numRight > 0) {
					let score = window.numRight;
					let maxScore = answers.length;
					
					if (window.pinpoint && window.qScores) {
						score = Object.values(qScores).reduce((a, cv) => {
							return a + cv;
						}, 0);
						maxScore = answers.length * 100;
						userPct = _.round(100*score/maxScore, 2);
					} else {
						userPct = _.round(userPct*100, 0);
					}
					if (!stopwatch) {
						// Update the played tag

						if (typeof window.bestPercent === 'undefined' || window.bestPercent < userPct) {
	                        $j('#played-tag')
								.html('Best: '+score+'/'+maxScore+' ('+userPct+'%)')
								.show();
						}
					}
					updateLastPlayedDate();

					// Update the friend scores
					var mode = stopwatch ? 'quizStopwatch' : 'quizFriends';
					var playTime = stopwatch ? timerSecs : origSecs-timerSecs;
					addPlayToFriendScoresCache(mode, score, playTime);
					window.Sporcle.scoreboards.quiz.params.mode = mode;
					showCollapsedQuizScoreboard($j('#quiz-scoreboard'), window.Sporcle.scoreboards.quiz);
				}
			}
		});
	} else {
		// This means it is a showdown play, nothing was logged.
		// openFlagshipPostGameModal happens in getReckoning if it's a flagship app showdown play
	}
}


function showAnswerBoxes() {
	$j('.answer').css({visibility:'visible'});
}

async function startGame(secsStart)
{
	window.Sporcle.gameData.startTime = Math.floor(Date.now() / 1000);
	inProgress = true;

	callSPHooks('start');

	if (overrideSecs >= 0) {
		origSecs = overrideSecs;
		giveUpDelay -= (secsStart - overrideSecs);
	} else {
		origSecs = secsStart;
	}
	origSecs = (overrideSecs >=0) ? overrideSecs : secsStart;
	origQuizTime = origSecs; // If time is added with the app addTime modal origSecs will be updated, keep original value

	$j('#button-showdown-lower').remove();
	$j('#button-showdown-upper').remove();
	
	$j('#preHide').hide();
	$j('#preHideContent').show();

	$j('#playPadding, .embeddable-start-button').hide();

	$j('#answer-wrapper').show();

	$j('#skip').css({visibility:'visible'});

	$j('#gameinput').prop('disabled',false);

	if (!showdownActive) {
		$j('#pauseBox').css({visibility:'visible'});
	}
	disableStopwatchPick();

	if (typeof gameID !== 'undefined' && !showdownActive) {
		var eventData = {
			g: gameID,
			mw: mweb,
			sw: stopwatch ? 1 : 0,
			a: 'st',
			ldtm : loadTime
		};
		$j.get('/games/includes/event.php', eventData);
	}

	$j('body').addClass('play active');
	
	// The `startgame` event kicks off a bunch of stuff on mobile web, so we want to yield execution before and after this
	await window.yieldToMain();
	$j(window).trigger('startgame');
	await window.yieldToMain();
	
	
	$j('#gameinput').trigger('focus');
	
	if (window.fakeInput) {
		window.fakeInput.remove();
	}

	startTimer();

	if (mweb) {
		$j('#pauseButton').on('click', function(e) {
			pauseGame();
		});

		const qhOpenEl = document.querySelector('#quiz-helpers-open');

		if (qhOpenEl) {
			$j('#quiz-helpers-open').on('click', () => {
				window.SporcleLib.Modal.openQuizHelpersModal();
			});

			let idleTimeout = null

			function resetIdleTimer() {
			    clearTimeout(idleTimeout);

			    idleTimeout = setTimeout(() => {
			        qhOpenEl.classList.remove('glisten-active');
			        void qhOpenEl.offsetWidth;
				    qhOpenEl.classList.add('glisten-active');
				    resetIdleTimer();
			    }, 10000);
			}

			window.addEventListener('touchstart', resetIdleTimer)
			resetIdleTimer();
		}
	}

	if (giveUpDelay <= 0) { addGiveUp(); }
	
	if (window.Sporcle.sendEmbedQuizEvents) {
		const msg = {source: 'sporcle', event: 'start'};
		window.parent.postMessage(msg, '*');
	}
}

function pauseGame(fromGiveUp)
{
	/* Separated out to account for instances where we want to stop game play without displaying the pause screen */
	delayGame();

	if (typeof gameID != 'undefined') {
		$j.get('/games/includes/event.php', {
			g  : gameID,
			mw : mweb,
			a  : fromGiveUp ? 'gup' : 'p'
		});
	}

	showPause(fromGiveUp);
}

function delayGame() {
	delayCount += 1;

	if (stop) {
		return;
	}

	$j('#time-progress').css({
		'animation-play-state' : 'paused'
	});

	pausedStartTime = new Date().getTime();
	stop = true;
}

// Grid quizzes for MW will automatically pause on being rotated horizontally if the view is too small.
// We don't want those to be counted towards pauses or resumes in gamereport_mobile.php so break this
// out into two separate parts
function unPauseGame() {
	resumeGame()

	if (typeof gameID != 'undefined') {
		$j.get('/games/includes/event.php', {g:gameID, mw:mweb, a:'r'});
	}
}

function resumeGame() {
	delayCount -= 1;

	if (!stop) {
		return;
	}

	if (delayCount > 0) {
		return;
	}

	$j('#time-progress').css({
		'animation-play-state' : stopwatch ? 'paused' : 'running'
	});

	stop = false;
	pausedTime += new Date().getTime() - pausedStartTime;

	if (stopwatch) {
		timerCorrection = (new Date().getTime() - (startTime+pausedTime)) - (timerSecs*1000);
	} else {
		timerCorrection = (new Date().getTime() - (startTime+pausedTime)) - ((origSecs-timerSecs)*1000);
	}

	gameTimer = setTimeout(redo, 1000-timerCorrection);

	if (!mweb) {
		$j('.instructions object, .instructions embed').show();
		$j('#gameinput').trigger('focus');
		$j('#pause-ad').html("");
	}
}

function showPause(fromGiveUp) {
	let pauseData = {
		time             : displayTime(timerSecs),
		quiz_length      : answers.length,
		correct          : currDisplayScore,
		quiz_name        : Sporcle.gameData.name,
		quiz_description : Sporcle.gameData.description,
		give_up          : fromGiveUp,
		show_score       : (Sporcle.gameData.isGrid ? 0 : 1),
		hideQuizHelp     : (Sporcle.gameData.quizHelpers.length == 0 ? 1 : 0),
	};

	if (mweb) {
		$j(window).trigger('showPause', pauseData);
	} else {
		$j('.tynt-close-btn').trigger('click'); // does not behave well with pause screen
		$j('.instructions object, .instructions embed').hide();
		SporcleLib.Modal.openPauseModal(pauseData);
	}
}

function decodeFlag(f) {
	return (parseInt(f, 36) % 2 == 0);
}

function getAnswer(slotNum, tryShort) {
	if (slotNum >= answers.length) {
		thisSlot = hidden[slotNum-answers.length];
	} else {
		thisSlot = answers[slotNum];
	}

	// Don't split at closing tags "</"
	var garbledGator = (asta['<'] == ']' ? "\\" : "") + asta['<'];
	var slashNoGator = thisSlot.search("[^"+garbledGator+"]\/");
	slashNoGator = slashNoGator == -1 ? -1 : slashNoGator + 1;	// Position of first slash that has no "<" before it
	slash = thisSlot.search("^\/") == 0 ? 0 : slashNoGator;		// If string starts with slash, go with that, otherwise use first slash not preceded by "<"

	if (slash != -1 && !tryShort) {
		thisSlot = thisSlot.slice(0, slash);
	}

	slotinfo = thisSlot;
	var e='';
	for(var i=0;i < slotinfo.length;i++){var c=slotinfo.slice(i,i+1);var d=false;for(var k in asta)if(asta[k]==c){	e+=k;d=true;}if(!d)	e+=c;}

	if (tryShort) {
		var parts = e.split('/');

		if ((parts.length > 2) && (parts[1].length >= 39)) {
			return parts[2];
		} else {
			return parts[0];
		}
	}

	return e;
}

function escapeHTML(unsafe) {
	return $j('<div>').text(unsafe).html();
}

function unescapeHTML(safe) {
	return $j('<div>').html(safe).text();
}

function disableStopwatch() {
	// Disable switching the timer settings
	$j('#timeBox .timer-controls-btn').attr('disabled', true).off('click keyup');

	// Hide "Practice Mode" button
	$j('#button-play.button-play-stopwatch').hide();
	
	// Seems most instances we disable stopwatch is a good time to disable quiz helpers
	$j('#quiz-helpers-open').hide();
	stopwatch = false;
}

function enableStopwatchPick() {
	$j('#timeBox .timer-controls-btn').attr('disabled', false).on({
		click: function(e) {
			selectTimerSetting($j(e.currentTarget).data('value'));
		},
		keyup: function(e) {
			if (e.keycode === 13) {
				selectTimerSetting($j(e.currentTarget).data('value'));
			}
		},
	});
}

function disableStopwatchPick() {
	$j('#timeBox .timer-controls-btn').attr('disabled', true).off('click keyup');
}

function shuffle(array) {
    var tmp, current, top = array.length;

    if(top) while(--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
    }

    return array;
}

function colorLum(hex, lum) {

	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	}
	lum = lum || 0;
	var rgb = "#", c, i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i*2,2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += ("00"+c).substr(c.length);
	}
	return rgb;
}

function getDarkerColor(color)
{
	return colorLum(color, -0.2);
}

function restoreFocus() {
	const isSporcleAppView = (window._payload || {}).is_flagship_app_view;

	if (isSporcleAppView) {
		// No in-page ads in the app so don't run. Does this chunk of code interact with the code I added
		// to sporcle/build/includes/sporcle-ui/game/play/common.js that pulls focus away quickly
		// sometimes causing an infinite loop? What's causing the infinite loop?
		//
		// Regardless, the app doesn't have in-page ads so we don't ever need to run restoreFocus for it
		return;
	}

	// If the active element is inside an iframe (that is not inside #embedMedia) then return focus to the game input

	if (document.activeElement.getAttribute('id') === 'gameinput') {
		return;
	}

	var iframeParent = document.activeElement.closest('iframe');

	if (!iframeParent) {
		return;
	}

	if (iframeParent.closest('#embedMedia')) {
		return;
	}

	$j('#gameinput').trigger('focus');
}