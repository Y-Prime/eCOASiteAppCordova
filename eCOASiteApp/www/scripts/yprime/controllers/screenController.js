/***********************
File: 			screenController.js
Date: 			29Oct2015
Created: 		J Osifchin
Description: 	control to handle changing pages and transitions
***************************/
var contentDivName = "main-content > div";
//var headerDivName = "header";
var footerName = 'main-footer';
var screenBasePath = "screens/";
var screenControlPath = "controls/";
var screenExtensionType = ".html";
var standardBackgroundCSS = "gray-background";
var screensViewed = [];
var screenHTMLAttribute = "screen-name";
var hiddenParameterName = 'plist';


var screenController = (function () {
    return {
        initialize: function () {
        },
        getDataTransferSuccessCallback: function (fn) {
            if(typeof dataTransferSuccessCallback == 'undefined'){
                dataTransferSuccessCallback = null;
            }
            return dataTransferSuccessCallback;
        },
        setDataTransferSuccessCallback: function (fn) {
            dataTransferSuccessCallback = fn;
        },
        getScreenUrl: function (screenName, pars) {
            return screenBasePath + screenName + screenExtensionType;// + this.formatUrlParameters(pars);
        },
        formatUrlParameters: function (pars) {
            var result = '';

            for (var p in pars) {
                result += (result.length > 0 ? '&' : '?') + p + '=' + pars[p];
            }

            return result;
        },
        getCurrentScreen: function () {
            return currentScreenName;
        },
        setCurrentScreen: function (screenName) {
            currentScreenName = screenName;
            screenController.clearScreenValues();
        },
        checkScreenValueObject: function () {
            if (typeof screenValueObject == 'undefined') {
                screenValueObject = {};
            }
        },
        getScreenValue: function (par) {
            screenController.checkScreenValueObject();
            if (typeof screenValueObject[par] == 'undefined') {
                screenValueObject[par] = null;
            }
            return screenValueObject[par];
        },
        setScreenValue: function (par, val) {
            screenController.checkScreenValueObject();
            screenValueObject[par] = val;
        },
        clearScreenValues: function () {
            screenValueObject = {};
        },
        changeScreen: function (screenName, title, backgroundCSS, contentDivOverloadObject, onSuccess, pars, isLandscapeOrientation) {
            //default orientation to portrait
            isLandscapeOrientation = (typeof isLandscapeOrientation == 'undefined') ? false : isLandscapeOrientation;

            function fnChange() {
                var url = screenController.getScreenUrl(screenName, pars);
                var contentDivOverloaded = false;
                var contentDiv;
                if (typeof contentDivOverloadObject == "object" && contentDivOverloadObject != null) {
                    contentDiv = $(contentDivOverloadObject);
                    contentDivOverloaded = true;
                } else {
                    contentDiv = $('#' + contentDivName);
                    //if ((screensViewed.length <= 1 || screensViewed[screensViewed.length - 1].screenName != screenName)) {
                    //    screensViewed.push({ screenName: screenName, title: title });
                    //}
                    screenController.addScreenViewed(screenName, title);
                    $('#' + footerName + ' > div').html('');
                }

                screenController.clearHeader(title);
                if (!contentDivOverloaded) {
                    screenController.clearScreenParameters();
                    if (typeof pars == "object") {
                        screenController.setScreenParameters(pars);
                    }
                }

                $(contentDiv).html('<img class="loading" src="./images/spinner.gif"/>Loading...');
                $(contentDiv).load(
                    url,
                    null,
                    function () {
                        //set the orientation of the screen
                        screenController.setOrientation(isLandscapeOrientation);
                        //$(contentDiv)
                        if (typeof onSuccess == 'function') {
                            onSuccess();
                        }
                        if (!contentDivOverloaded) {
                            screenController.headerHandler(title);
                        }
                        screenController.contentHandler(contentDiv);
                        screenController.initInputDefaults(contentDiv, screenName);
                        //if the content is a control (numpad) don't reset the footer
                        if (!contentDivOverloaded) {
                            screenController.footerHandler(contentDiv);
                        }

                        screenController.customControlHandler(contentDiv);
                        screenController.translateScreen(contentDiv);
                        screenController.refreshContentJQM();
                        screenController.setCurrentScreen(screenName);
                    }
                ).hide().fadeIn('fast').find('input').first().focus();
            };
            if (typeof contentDivOverloadObject == "object" && contentDivOverloadObject != null) {
                fnChange();
            } else {
                screenController.allowScreenChange(screenName, fnChange);
            }

        },
        allowScreenChange: function (screenName, onSuccess) {
            function fnShow() {
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            };

            var skipList = [
                'Login',
                'EnterOldPIN',
                'EnterNewPIN',
                'ConfirmNewPIN',
                'EnrollmentSuccess',
                'Error',
                'SelectReminderType',
                'EnterEmailAddress',
                'EnterPhoneNumber',
                'SelectReminderTime',
                'ChangePINSuccess',
                'Debug',
                'ForgotPIN',
                'QuestionResponse',
                'ElectronicSignature',
                'ChangePINSuccess'
            ];

            if (arrayContains(skipList, screenName)) {
                fnShow();
            } else {
                patientController.checkForTemporaryPin(function () {
                    patientController.checkForReminderSetup(function () {
                        patientController.checkForTrainingCompleted(fnShow);
                    });
                });
            }
        },
        refreshContentJQM: function () {
            $('#' + contentDivName).trigger('create');
            //check for custom init calls
            //note variables are in question.js object
            $('#' + contentDivName).find('[' + customQuestionCreateAttribute + ']').each(function () {
                $(this).trigger(customQuestionCreateEvent);
            });
        },
        refreshHTMLObjectJQM: function (lookup) {
            $('#' + lookup).trigger('create');
        },
        headerHandler: function (title) {
            if (title != null) {
                $('header').html(title.length > 0 ? translationController.get(title, translationController.defaultLanguageId()) : '');
            }
        },
        clearHeader: function (title) {
            if (title != null) {
                $('header').html('');
            }
        },
        contentHandler: function (contentDiv) {
            //navigation button control
            var event = 'click.yprime';
            $(contentDiv).find('.nav-button').each(function () {
                //(this).unbind(event);
                $(this).bind(
                    event,
                    function () {
                        screenController.buttonHandler(this);
                    }
                );
            });
        },
        buttonHandler: function (obj) {
            var nextScreen = $(obj).attr('next-screen');
            var title = $(obj).attr('next-screen-title');
            var contentDiv = $(obj).attr('next-screen-content-div');
            var backgroundCSS = $(obj).attr('next-screen-background-css');

            screenController.changeScreen(nextScreen, title, backgroundCSS, contentDiv, null)
        },
        footerHandler: function (contentDiv) {
            //footer control
            if ($(contentDiv).find('footer').length > 0) {
                $(contentDiv).find('footer').children().each(function () {
                    //all footer markup gets sent to the footer
                    $(this).detach().appendTo($('#' + footerName + ' > div'))
                });
                $(contentDiv).find('footer').detach();
            } else {
                //set default footer text
                var text = $('<div class="standard-padding"></div>');
                $(text).html(screenController.defaultFooterText());
                $('#' + footerName + ' > div').append($(text));
                //$('#' + footerName + ' > div').html(screenController.defaultFooterText());
            }
        },
        defaultFooterText: function () {
            return translationController.get('keyCopyright');
        },
        customControlHandler: function (contentDiv) {
            $(contentDiv).find('.numeric-pad').each(function () {
                if ($(this).html().length == 0) {
                    screenController.renderNumericPad($(this));
                }
            });
        },
        clearScreenParameters: function () {
            //delete window.plist;
        },
        getScreenParameters: function () {
            return window.plist;
        },
        setScreenParameters: function (parameters) {
            window.plist = parameters;
        },
        renderNumericPad: function (obj) {
            function fn() {
                var inputID = $(obj).attr('numeric-input');
                //this is how you pass a function handler to the "C" button
                var clickEvent = $(obj).attr('click-event');

                $(obj).find('button').each(function () {
                    var fnClickHandler = function () {
                        var val = $(this).attr('data-value');
                        var inClickEventAttribute = 'inclickevent';
                        var inClick = $(this).attr(inClickEventAttribute) == "true" || $(this).attr(inClickEventAttribute) == true;
                        if (!inClick) {
                            $(this).attr(inClickEventAttribute, true);
                            switch (val) {
                                case "del":
                                    var currentValue = $('#' + inputID).val() + "";
                                    $('#' + inputID).val(currentValue.length > 0 ? currentValue.substring(0, currentValue.length - 1) : "");
                                    break;
                                case "clear":
                                    if (typeof clickEvent == 'undefined') {
                                        $('#' + inputID).val('');
                                    } else {
                                        eval('(function () { ' + clickEvent + '(); })();');
                                    }
                                    break;
                                default:
                                    var maxLength = $('#' + inputID).attr('maxlength') ? parseInt($('#' + inputID).attr('maxlength')) : 999;
                                    var currentValue = $('#' + inputID).val() + "";
                                    if (currentValue.length < maxLength) {
                                        $('#' + inputID).val(currentValue + val);
                                    }
                                    break;
                            }
                            //call this to make sure the cached answers are updated
                            $('#' + inputID).trigger('keyup.yprime');
                            var obj = this;
                            //assembla #?? - fix responsiveness on keypad - jo 01Feb2016
                            setTimeout(function () { $(obj).attr(inClickEventAttribute, false); }, 100);
                        }
                    };
                    //attempt to speed up the clicks
                    //$(this).bind('click', fnClickHandler);
                    $(this).bind('tap', fnClickHandler);

                    if ($(this).attr('data-value') == 'clear' && typeof clickEvent != 'undefined') {
                        //display an ok button
                        $(this).html('').addClass('fa fa-check fa-2x');
                    }
                });

                $('#' + inputID).prop('disabled', 'disabled');
            };
            screenController.changeScreen(screenControlPath + 'NumericPad', null, null, obj, fn);
        },
        initInputDefaults: function (obj, screenName) {
            $(obj).find('input').each(function () { screenController.initControlValue(this, screenName); });
            $(obj).find('select').each(function () { screenController.initControlValue(this, screenName); });
            $(obj).find('radio').each(function () { screenController.initControlValue(this, screenName); });
        },
        getSavedControlValue: function (obj, screenName) {
            var type = $(obj)[0].type;
            var id = $(obj)[0].id;
            var name = $(obj)[0].name;
            var isQuestion = $(obj).attr(questionIdAttribute) != undefined;

            var defaultValue = answers[(!isQuestion ? screenName + '.' : '') + id];

            if (type == 'radio') {
                defaultValue = answers[(!isQuestion ? screenName + '.' : '') + name];
            }

            //TODO: this may need to be updated to handle multiple answers

            return defaultValue;
        },
        setSavedControlValue: function (obj, screenName, value) {
            var type = $(obj)[0].type;
            var id = $(obj)[0].id;
            var name = $(obj)[0].name;
            var isQuestion = $(obj).attr(questionIdAttribute) != undefined;

            if (type == 'radio') {
                answers[(!isQuestion ? screenName + '.' : '') + name];
            } else {
                answers[(!isQuestion ? screenName + '.' : '') + id] = value;
            }
            
            return true;
        },

        initControlValue: function (obj, screenName) {
            var type = $(obj)[0].type;
            var id = $(obj)[0].id;
            var name = $(obj)[0].name;
            var defaultValue = this.getSavedControlValue(obj, screenName);

            if (type != "button") {
                //set the default value
                if (typeof defaultValue != 'undefined' && defaultValue != null) {
                    switch (type) {
                        case "radio":
                            $('input:radio[name="' + name + '"][value=' + defaultValue + ']').click();
                            break;
                        default:
                            $(obj).val(defaultValue);
                            break;
                    }

                }
                var events = ["change.yprime"];
                switch (type) {
                    case "text":
                    case "password":
                    case "number":
                    case "hidden":
                        events = ["keyup.yprime"];
                        events.push("input.yprime");

                        //add validation
                        var validationEvents = ["keydown.yprime"];
                        for (var i = 0; i < validationEvents.length; i++) {
                            $(obj).unbind(validationEvents[i]);
                            $(obj).bind(validationEvents[i], screenController.inputValidationHandler);
                        }
                        break;
                }

                for (var i = 0; i < events.length; i++) {
                    var event = events[i];
                    $(obj).unbind(event);
                    $(obj).bind(event, screenController.inputChangeHandler);
                }

            };

            $(obj).attr(screenHTMLAttribute, screenName);
        },
        inputChangeHandler: function () {
            var id = $(this)[0].id;
            var screen = $(this).attr(screenHTMLAttribute);
            var name = $(this)[0].name;
            var type = $(this)[0].type;
            var isQuestion = $(this).attr(questionIdAttribute) != undefined;
            var lookup = '';

            switch (type) {
                case "radio":
                    lookup = (!isQuestion ? screen + '.' : '') + name;
                    break;
                default:
                    lookup = (!isQuestion ? screen + '.' : '') + id;
                    break;
            }

            answers[lookup] = $(this).val();
            //TODO: this may need to be updated to handle multiple answers

            //console.log('Change handler:' + screen + "." + id + ' = ' + answers[screen + "." + id]);
        },
        inputValidationHandler: function (e) {
            var id = $(this)[0].id;
            var name = $(this)[0].name;
            var type = $(this)[0].type;
            //NOTE: allow backspace, tab, etc...
            var asciiKey = e.keyCode;

            //TODO: add code to handle ranges and custom values, regex...
            //validate length
            if (asciiKey >= 48 && typeof $(this).attr("maxlength") != 'undefined' && $(this).attr("maxlength").length > 0 && $(this).val().length >= parseInt($(this).attr("maxlength"))) {
                return e.preventDefault();
            }

        },
        clearInputDefaults: function () {
            answers = {};
        },
        translateScreen: function (obj) {
            $(obj).find('[translation]').each(function () {
                translationController.translateHTMLObject(this);
            });
            $('#' + footerName + ' > div').find('[translation]').each(function () {
                translationController.translateHTMLObject(this);
            });
        },
        goToPreviousScreen: function (isMovingBackQuestion, isMovingBackStandard) {
            var screenObject = screenController.lastScreenViewed();
            //make sure it does't get caught in a loop - don't do this yet, it doesn't work
            if (!arrayContains(screenController.screenSkipList, screenController.getCurrentScreen())) {
                // screensViewed.pop();
            }
            if (isMovingBackQuestion) {
                questionController.questionPagesViewed.pop();
            } else {
                if (isMovingBackStandard) {
                    screensViewed.pop();
                }
            }

            screenController.changeScreen(screenObject.screenName, screenObject.title);
        },
        screenSkipList: [
            //'QuestionResponse',
            'TrainingComplete',
            'PatientLogin',
            'PatientEnrolledSuccess',
            'EnrollmentSuccess',
            'EnterNewPIN',
            'EnterOldPIN',
            'ConfirmNewPIN',
            'SelectReminderTime',
            'SelectReminderType',
            'UpdateReminderSuccess',
            'EnterEmailAddress',
            'EnterPhoneNumber'
            ],
        addScreenViewed: function (screenName, title) {
            //NOTE: add all custom questionnaire screens here!!

            if (!arrayContains(screenController.screenSkipList, screenName)) {
                if (screensViewed.length <= 1 || screensViewed[screensViewed.length - 1].screenName != screenName) {
                    screensViewed.push({ screenName: screenName, title: title });
                }
            }
        },
        lastScreenViewed: function () {
            var lastScreen = {};
            switch (screensViewed.length) {
                case 0:
                    break;
                case 1:
                    lastScreen = screensViewed[0];
                    break;
                default:
                    var offset = 2; //arrayContains(screenController.screenSkipList, screenController.getCurrentScreen()) ? 1 : 2;
                    lastScreen = screensViewed[screensViewed.length - offset];
                    break;
            };

            return lastScreen;
        },
        setBackgroundCSS: function (css) {
            //handle the background css
            $('header').parent()[0].className = '';
            css = (css == null || css.length == 0) ? standardBackgroundCSS : css;
            $('header').parent().addClass(css);
        },
        setOrientation: function (isLandscape) {
            if (typeof screen.lockOrientation != 'undefined') {
                screen.lockOrientation(isLandscape ? 'landscape' : 'portrait');
            }
        }
    };
})();