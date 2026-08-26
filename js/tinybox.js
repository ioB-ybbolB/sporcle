window.SporcleLib = window.SporcleLib || {};
window.SporcleLib.Modal = window.SporcleLib.Modal || {};

SporcleLib.Modal._openModal = function(html, args, callback, templateVars){
	// Store our lastClickedEl so we can return to it after the user exits a Modal.
	// Stored in the Modal object as const/let/var variables instances don't change in event listener after first assignment even when in a parent scope.
	if (SporcleLib.Modal.lastClickedEl === undefined) {
		SporcleLib.Modal.lastClickedEl = document.activeElement;
	}

    if (typeof SporcleLib.Modal._remodal === 'undefined') {
        SporcleLib.Modal._remodal = $j(document.createElement('div')).remodal();
	}

	SporcleLib.Modal._remodal.$modal.on('opened', function () {
		$j('input').not('.remodal input, input[data-no-tabindex]').attr('tabindex', "-1");
		
		// Initializes the first trap of modal focus.
		trapModalFocus();
	});

	SporcleLib.Modal._remodal.$modal.on('closed', function () {
		SporcleLib.Modal._remodal.$modal.attr({class: 'remodal remodal-is-initialized remodal-is-closed'});
		SporcleLib.Modal._remodal.$overlay.attr({class: 'remodal-overlay remodal-is-closed'});

		if(args.hasOwnProperty('onClose')){
			args.onClose(SporcleLib.Modal._remodal);
		}

		reorderTabIndex(0);

		returnFocusFromModal();
	});

    if (typeof args !== 'undefined' && typeof args.switching !== 'undefined' && args.switching) {
        var content = typeof templateVars !== 'undefined' ? _.template(html)(templateVars) : html;

        SporcleLib.Modal._remodal.switch($j(document.createElement('div')), args, content);

        if (typeof callback === 'function') {
            callback(SporcleLib.Modal._remodal);
        }

        SporcleLib.Modal._started = undefined;

    } else {
        if (typeof templateVars !== 'undefined') {
            SporcleLib.Modal._remodal.$modal.html(_.template(html)(templateVars));
        } else {
            SporcleLib.Modal._remodal.$modal.html(html);
        }

        if (typeof callback === 'function') {
            callback(SporcleLib.Modal._remodal);
        }

        SporcleLib.Modal._remodal.open();

        SporcleLib.Modal._started = undefined;
    }

	// This call is incase there this is a second modal popup in the UI such as the Register Modal. Otherwise the focus would default to the tabbable element list for the initial modal and would fail to work correctly.
	trapModalFocus();
};

SporcleLib.Modal._openModalFromAjax = function(url, args, callback, templateVars, modalParams) {
    if (typeof SporcleLib.Modal._started === 'undefined') {
		SporcleLib.Modal._started = 'opening';
		
		args = typeof args !== 'undefined' ? args : {};
		
		// Strip all functions from args so they aren't a part of the query below.
		args = Object.fromEntries(Object.entries(args)
				.filter(arg => typeof arg[1] !== 'function'));

		modalParams = typeof modalParams !== 'undefined' ? modalParams : {};

		var ajaxMethod = 'GET';
		if (typeof modalParams.ajaxMethod !== 'undefined' && modalParams.ajaxMethod && ['GET', 'POST'].indexOf(modalParams.ajaxMethod) > -1) {
			ajaxMethod = modalParams.ajaxMethod;
		}

		$j.ajax({
			type : ajaxMethod,
			data : args,
			url  : url
		})
		.done(function(response) {
			SporcleLib.Modal._openModal(response, args, callback, templateVars)
		})
        .fail(function (xhr)  {
            var message;

            if (xhr.responseJSON && xhr.responseJSON.message) {
                message = xhr.responseJSON.message;
            } else if (xhr.hasOwnProperty('responseText') && xhr.responseText){
                var res = JSON.parse(xhr.responseText);
                if(res.hasOwnProperty('message') && res.message){
                    message = res.message;
                }
            }

            if(!message){
                message = 'Oops, something went wrong when creating your challenge. Please refresh and try again.';
            }

            showMainPageAlert(message, {
                type: 'danger',
                dismissible: true
            });

            SporcleLib.Modal._started = undefined;
            SporcleLib.Modal._remodal = undefined;
		});
	}
};

SporcleLib.Modal.openUnverifiedModal = function(args) {
	var payload = window._payload || {} ;
	payload.register_action = (typeof args.registerAction != 'undefined' ? args.registerAction : function() {return function() {window.location.reload();}});
	window._payload = payload;

	SporcleLib.Modal._openModalFromAjax('/ajax/modals/unverified_promo.php', args, function(remodal) {
		remodal.$modal.attr('id', 'verifyPromo');

		remodal.$modal.find('#verifyPromoResendEmail').on('click', function(e) {
			var $this = $j(this);
			var $verifyText = remodal.$modal.find('#verifyPromoText');

			$j.ajax({
				type : 'GET',
				url  : '/ajax/banners.php',
				data : {
					banner : 'banner-verify',
					resend : 1
				}
			})
			.done(function(response) {
				var $el = $j(document.createElement('span'));
				if (response.success) {
					$el.html('Resent your verification e-mail. Check your e-mail inbox and click the link we sent you.');
				} else {
					$el.html('Too many resend attempts. Try again later.');
				}

				$verifyText.html($el);
				$this.remove();
			});
		});
	});
};

SporcleLib.Modal.openReportedModal = function(args) {
	SporcleLib.Modal._openModalFromAjax('/games/includes/modals/reported.php', {
        game_id: args.game_id
    }, function(remodal) {

		remodal.$modal.one('closed', function () {
			// This is to hide the tooltip, since our accessible tooltips display when the button is focused.
			$j('#reported-link').blur();
		});

        var $dismiss = remodal.$modal.find('.dismiss-report');
        $dismiss.on('click', function(e) {
            var elID = $j(e.currentTarget).attr('id');
            elID = elID.replace("dismiss-", "");
            var type = elID.includes('review') ? 'review' : 'report';
            var id = elID.replace(type+'-', '');

            var handleComment = $j('#comment-'+type+'-'+id); //content
            var reporterID = $j('#reporter-id-'+type+'-'+id); //value
            var notify = $j('#notify-reporter-'+type+'-'+id); //value

            $j.ajax({
                url: '/games/ajax/handle_reports.php',
                type: 'post',
                data: {
                    'action'      : 'dismiss',
                    'game_id'     : window.Sporcle.gameData.gameID,
                    'type'        : type,
                    'id'          : id,
                    'reporter_id' : $j(reporterID).val(),
                    'notify'      : $j(notify).val()
                },
            }).done(function(response) {
                remodal.$modal.find('.alertBad').hide();
                $j('#quiz-report-'+type+'-'+id).remove();

                if ($j('.quiz-report').length === 0) {
                    $j('#reported-link').hide();
                    remodal.close();
                }
            }).fail(function(response) {
                remodal.$modal.find('.alertBad').text(response.responseJSON.error);
                remodal.$modal.find('.alertBad').show();
            });
        });

        var $handle = remodal.$modal.find('.handle-report');
        $handle.on('click', function(e) {
            var elID = $j(e.currentTarget).attr('id');
            elID = elID.replace("handle-comment-", "");
            var type = elID.includes('review') ? 'review' : 'report';
            var id = elID.replace(type+'-', '');

            var handleSection = $j('#comment-section-'+type+'-'+id);

            handleSection.show();
        });

        var $saveComment = remodal.$modal.find('.save-report-comment');
        $saveComment.on('click', function(e) {
            var elID = $j(e.currentTarget).attr('id');
            elID = elID.replace("save-comment-", "");
            var type = elID.includes('review') ? 'review' : 'report';
            var id = elID.replace(type+'-', '');

            var handleComment = $j('#comment-'+type+'-'+id); //content
            var reporterID = $j('#reporter-id-'+type+'-'+id); //value
            var notify = $j('#notify-reporter-'+type+'-'+id); //value

            $j.ajax({
                url: '/games/ajax/handle_reports.php',
                type: 'post',
                data: {
                    'action'      : 'handle',
                    'game_id'     : window.Sporcle.gameData.gameID,
                    'type'        : type,
                    'comment'     : handleComment.val(),
                    'id'          : id,
                    'reporter_id' : reporterID.val(),
                    'notify'      : notify.val()
                },
            }).done(function(response) {
                remodal.$modal.find('.alertBad').hide();
                $j('#quiz-report-'+type+'-'+id).remove();

                if ($j('.quiz-report').length === 0) {
                    $j('#reported-link').hide();
                    remodal.close();
}
            }).fail(function(response) {
                remodal.$modal.find('.alertBad').text(response.responseJSON.error);
                remodal.$modal.find('.alertBad').show();
            });
        });
	});
};

SporcleLib.Modal.openReportCommentModal = function(args) {
	SporcleLib.Modal._openModalFromAjax('/games/includes/modals/report_comment.php', {
    }, function(remodal) {
		remodal.$modal.attr('id', 'confirmReport'+args.comment_id);

		remodal.$modal.find('#confirmReport').on('click', _.once(function() {
			args.callback();
            remodal.close();
		}))

        remodal.$modal.find('#cancelReport').on('click', _.once(function() {
			remodal.close();
		}))
	});
}

SporcleLib.Modal.openRatingsBreakdownModal = function() {
	SporcleLib.Modal._openModalFromAjax('/games/includes/modals/ratings_breakdown.php', {
		g: gameID
	}, function(remodal) {
		remodal.$modal.attr('id', 'ratings-breakdown');
	});
}

SporcleLib.Modal.openPauseModal = function(args) {
	SporcleLib.Modal._openModalFromAjax('/games/includes/pause.php', args, function(remodal) {
		remodal.settings.closeOnOutsideClick = false;
		remodal.$overlay.addClass('pauseScreen');
		remodal.$modal.addClass('pauseScreen');

		setTimeout(function(){remodal.$modal.find('#resumeBtn').show();},800);

		remodal.$modal.find('#resumeBtn').on('click', function() {

            var pausepagePlaybuzz = document.getElementById('stream-sdk-jssdk_sporcle.com_Test');
            if(pausepagePlaybuzz){
                pausepagePlaybuzz.parentNode.removeChild(pausepagePlaybuzz);
            }
			remodal.close();
		});

        var gamepagePlaybuzz = $j('#playbuzz-gamepage-anchor');

        if(gamepagePlaybuzz.length){
            gamepagePlaybuzz.css('visibility', 'hidden');
        }

		remodal.$modal.one('closed', function () {
			remodal.settings.closeOnOutsideClick = true;
			remodal.$overlay.removeClass('pauseScreen');
			remodal.$modal.removeClass('pauseScreen');

            if(gamepagePlaybuzz.length){
                gamepagePlaybuzz.css('visibility', 'visible');
            }

			unPauseGame();
			remodal.$modal.off('closed');
		});
	});
};

SporcleLib.Modal.openBlurPunishModal = function(args) {
	SporcleLib.Modal._openModalFromAjax('/games/includes/showdown_blur_modal.php', args, function(remodal) {
		remodal.settings.closeOnOutsideClick = false;
		remodal.$overlay.addClass('pauseScreen');
		remodal.$modal.addClass('pauseScreen');

		var punishTime = 30;
		switch (args.blur_count) {
			case 1: punishTime = 0; break;
			case 2: punishTime = 5; break;
			case 3: punishTime = 15; break;
			default: break;
		}

		var countdownTimer = punishTime;
		if (countdownTimer > 0) {
			punishTime = punishTime * 1000;
			remodal.$modal.find('#countdown').text(countdownTimer);
			// remodal.$modal.find('#dynamicMessage').text("Continue in");

			var interval = setInterval(function() {
				countdownTimer--;
				if (countdownTimer == 0) {
					var noun = args.rtc ? 'Challenge' : 'Showdown';
					remodal.$modal.find('#showdownResume').removeClass('disabled');
					remodal.$modal.find('#countdown').text("");
					// remodal.$modal.find('#dynamicMessage').text(`Continue your ${noun} with ${args.opponent_name}`);
					clearInterval(interval);
				} else {
					remodal.$modal.find('#countdown').text(countdownTimer);
				}

			}, 1000);
		} else {
			remodal.$modal.find('#showdownResume').removeClass('disabled');
			remodal.$modal.find('#dynamicMessage').text('');
		}

		remodal.$modal.find('#showdownResume').on('click', function() {
			window.showdown.vm.api.closeBlurPunishModal();
			remodal.close();
		});

		remodal.$modal.one('closed', function () {
			remodal.settings.closeOnOutsideClick = true;
			remodal.$overlay.removeClass('pauseScreen');
			remodal.$modal.removeClass('pauseScreen');
			remodal.$modal.off('closed');
		});
	});
};

SporcleLib.Modal.openReportLive5Modal = function(args) {
	SporcleLib.Modal._openModalFromAjax('/games/includes/modals/report_livefive.php', args, function(remodal) {
		remodal.$modal.attr('id', 'report5');

		remodal.$modal.on('opened', function() {
			remodal.$modal.find('#message').trigger('focus');
		});

		remodal.$modal.find('#sendReport').on('click', function() {
			$j.ajax({
				url      : "/livefive/livefive_report.php",
				type     : "POST",
				data     : {
					question_id : args.question_id,
					reason      : remodal.$modal.find('#report_reason').val(),
					message     : encodeURIComponent(remodal.$modal.find('#message').val())
				},
				dataType : 'html'
			}).done(function(data) {
				remodal.$modal.find('.reportContent').html(data);
			});
		});
	});
};

SporcleLib.Modal.openDashboardCSVModal = function() {
    SporcleLib.Modal._openModalFromAjax('/create/modals/dashboard_csv.php', {}, function(remodal) {
        var error = $j("#error");
        error.text('');
        remodal.$modal.find('#download-csv').on('click', function() {
            var tab = $j("#dashboard-csv-tab").val();
            var spinner = $j("#ajax-loader");

            var self = $j(this);

            self.hide();
            spinner.show();

            $j.ajax({
                type: 'GET',
                url: '/create/ajax/dashboard_data_csv.php',
                data: {tab: tab},
                success: function(response){

                    if(typeof response === 'object' && response.hasOwnProperty('success')){

                        if(!response.success && response.error){
                            error.text(response.error);
                        } else if (!response.success){
                            error.text("Oops! Something went wrong. Please refresh and try again.");
                        }

                        spinner.hide();
                        self.show();

                    } else {
                        var today = new Date();
                        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
                        var time = today.getHours() + "-" + today.getMinutes() + "-" + today.getSeconds();
                        var dateTime = date+'_'+time;
                        var file = tab + '_data_' + dateTime + '.csv';
                        downloadDashboardCSV(file, response);
                        remodal.close();
                    }
                },
                error: function (err) {
                    error.text("Oops! Something went wrong. Please refresh and try again.");
                    spinner.hide();
                    self.show();
                }
            })
        });
    });
};

function downloadDashboardCSV(filename, data){
    var blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

function reorderTabIndex(startingIndex)
{
	startingIndex = parseInt(startingIndex, 10);
	var allElements = [];
	allElements = document.body.getElementsByTagName("*");
	var allElementsLength = allElements.length;

	for (var i = 0; i < allElementsLength; i++)
	{
		if (allElements[i].getAttribute("tabindex") != null)
		{
			var currentIndex = allElements[i].getAttribute("tabindex");
			currentIndex = parseInt(currentIndex, 10);
			allElements[i].setAttribute("tabindex", startingIndex + currentIndex);
		}
	}
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

SporcleLib.Modal.openReportVenueModal = function(args) {
    SporcleLib.Modal._openModalFromAjax('/events/includes/report_venue_modal.php', {}, function(remodal) {
        var ajaxLoader = '<div id="report-ajax-loader"></div>';
        var emailInput = remodal.$modal.find('#email');
        var extraInfoInput = remodal.$modal.find('#detailInfo');
        var sendReportButton = remodal.$modal.find(".submit-container");
        var inputErrors = remodal.$modal.find(".error");
        var genError = remodal.$modal.find("#general-error");
        inputErrors.text('');

        remodal.$modal.find('#report-venue-form').on('submit', function() {

            var email = emailInput.val().trim();
            var reason = remodal.$modal.find('#reason').val().trim();
            var extraInfo = extraInfoInput.val().trim();
            var hasErrors = false;
            inputErrors.text('');

            if(!validateEmail(email)){
                remodal.$modal.find('.email-container .error').text('Incorrect email format')
                hasErrors = true;
            }

            if(hasErrors) return;

            sendReportButton.html(ajaxLoader);

            $j.ajax({
                url: "/ajax/events/report_venue.php",
                type: "POST",
                data: {
                    venueID: args.venueID,
                    email: email,
                    reason: reason,
                    extraInfo: extraInfo
                }
            }).done(function(data) {

                remodal.close();
                showMainPageAlert('Thanks for your report! We will investigate the issue.', {type: 'success'});

            }).fail(function (err) {
                genError.text('Oops! Something went wrong. Please refresh and try again.');
                sendReportButton.html('<button class="button-primary" type="submit" >Send Report</button>');
            })
        });
    });
};

SporcleLib.Modal.openPreviouslyPlayedSetModal = function(args) {
	const html = $j('#previously-played-set-template').html();
	
	const callback = function(remodal) {
		remodal.$modal.find('#btn-yes').on('click', function() {
			remodal.close();
			args.onYes();
		})
		
		remodal.$modal.find('#btn-no').on('click', function() {
			remodal.close();
		})
	}
	
	const templateVars = {
		date : args.date
	}
	
	SporcleLib.Modal._openModal(html, {}, callback, templateVars);
}

SporcleLib.Modal.openConfirmationModal = function(args) {
    var html = $j('#sporcle-confirmation-modal-template').html();

    var callback = function(remodal) {
        remodal.$modal.attr('id', 'confirmationModal');

        remodal.$modal.find('.confirmation-button #yes').on('click', function() {
            if(args.hasOwnProperty('onYes')){
                args.onYes(remodal);
            } else {
                showMainPageAlert('Oops! Something went wrong. Please contact <a href="/feedback/">feedback</a> with as much detail as possible.')
            }
        });

        remodal.$modal.find('.confirmation-button #no').on('click', function() {
            if(args.hasOwnProperty('onNo')){
                args.onNo(remodal);
            }

            remodal.close();
        });


        remodal.$modal.on('keydown', function (e) {
            if(e.which == 13 && remodal.$modal.hasClass('remodal-is-opened')){
                if(args.hasOwnProperty('onYes')){
                    remodal.$modal.off('keydown');
                    args.onYes(remodal);
                }
            } else if (e.which == 27){
                remodal.close();
                e.stopImmediatePropagation(); //in case other JS on the page attached an escape keydown listener to the document (i.e. grid)
            }
        });
    };

    var templateVars = {
        msg: args.hasOwnProperty('msg') ? args.msg : 'Are you sure you want to do this?',
        yt: args.hasOwnProperty('yt') ? args.yt : 'Yes',
        nt: args.hasOwnProperty('nt') ? args.nt : 'No'
    };

    var remodalArgs = {
        onClose: function (remodal) {
            remodal.$modal.off('keydown');

            if(args.hasOwnProperty('always')){
                args.always();
            }
        }
    };

    SporcleLib.Modal._openModal(html, remodalArgs, callback, templateVars);
};

SporcleLib.Modal.openVirtualTriviaVideoModal = function() {
	var html = $j('#video-modal-template').html();
	SporcleLib.Modal._openModal(html, {}, function(remodal) {
		remodal.$modal.one('closed', function (e) {
			remodal.$modal.empty();
		});
	});
};

SporcleLib.Modal.openVenueSlideShowModal = function(html, callback) {
	SporcleLib.Modal._openModal(html, {}, function(remodal) {
		remodal.$modal.one('closed', function (e) {
			remodal.$modal.empty();
		});

		callback(remodal);
	});
};


SporcleLib.Modal.openQuestObjectiveModal = function(objectiveID) {
	SporcleLib.Modal._openModalFromAjax('/quests/ajax/objectivemodal.php', {
		objective_id : objectiveID,
	}, function(remodal) {
		SporcleLib.Modal._remodal.$modal.attr({class:'remodal remodal-is-initialized remodal-is-opened quest'});
	});
};

// Traps the focus to within the current modal
function trapModalFocus() {
	// Find the tabbable elements
	SporcleLib.Modal.tabbableList = $j('.remodal-wrapper .remodal-is-opened')
                .find('select, input, textarea, button, a')
                .filter(':visible');

	const firstTabbable = SporcleLib.Modal.tabbableList.first();
	const lastTabbable = SporcleLib.Modal.tabbableList.last();

	// IF they they press Tab on the last element in modal the focus moves to the first element in modal.
	lastTabbable.on('keydown', function (e) {
		if (e.which === 9 && !e.shiftKey) {
			e.preventDefault();
			firstTabbable.focus();
		}
	});

	// Vice versa to event listener above when the user presses Shift + Tab.
	firstTabbable.on('keydown', function (e) {
		if (e.which === 9 && e.shiftKey) {
			e.preventDefault();
			lastTabbable.focus();
		}
	});
}

function returnFocusFromModal() {
	$j(SporcleLib.Modal.lastClickedEl).focus();

	SporcleLib.Modal.lastClickedEl = undefined;
}
