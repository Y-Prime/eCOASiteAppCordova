/***********************
File: 			Question.js
Date: 			05Nov2015
Created: 		J Osifchin
Description: 	Question Object
                Inherits from Base Object
***************************/
var customQuestionCreateEvent = 'yprime.customInit';
var customQuestionCreateAttribute = 'custominit';
var questionIdAttribute = 'question-id';
var questionDelimiter = '___';
var controlTypeAttribute = 'control-type';


function Question(obj, onSuccess, onError) {
    //initialize the object
    inheritBase(this);
    this.tableName = function () { return "EDiaryQuestion"; };

    this.Id = null;
    this.EdiaryQuestionnaire = '';
    this.EdiaryInputFieldType = '';
    this.Text = null;
    this.InputDisplayText = null;
    this.Order = -1;
    this.MinValue = 0;
    this.MinValueText = '';
    this.MaxValue = 100;
    this.MaxValueText = '';
    this.IsActive = 'Y';
    this.IsRequired = 'N';
    this.IsInstruction = 'N';
    this.Group = '';
    this.IsLandscapeOrientation = false;

    this.entryResponses = function () {
        //TODO: add code to pull all entries for this question
        //answers use this as id: [type]_[sortorder]_[id]
        var result = [];
        if (answers[this.controlInputId()]) {
            result.push(answers[this.controlInputId()]);
        }
        return result;
    };

    this.controlDivId = function () {
        return 'div-' + this.controlInputId();
    };
    this.controlInputId = function () {
        return this.EdiaryQuestionnaire + questionDelimiter + this.Order + questionDelimiter + this.Id;
    };

    this.get = function (questionId, onSuccess, onError) {
        var sql = 'SELECT * FROM EDiaryQuestion WHERE id=?';
        var pars = [questionId];
        var handler = this;
        function callback(tx, results) {
            if (results.length == 1) {
                handler.mergeObject(results[0]);
                if (typeof onSuccess == 'function') {
                    onSuccess(tx, results);
                }
            }
        }

        dbController.executeSql(sql, pars, callback, onError);
    };

    this.getNextQuestionId = function () {
        //TODO: add additional logic here, looking at answers etc
        //read the instructions
        var result = null;
        var questionnaireComplete = false;

        if (questionController.instructions[this.EdiaryQuestionnaire] && questionController.instructions[this.EdiaryQuestionnaire][this.Order]) {
            var pageInstructions = questionController.instructions[this.EdiaryQuestionnaire][this.Order];
            if (pageInstructions.Routes.length > 0) {
                for (var i = 0; i < pageInstructions.Routes.length; i++) {
                    var route = pageInstructions.Routes[i];

                    if (typeof route.NavigateTo != 'function') {
                        //this is a straight navigation lookup
                        var q = new Question({
                            EdiaryQuestionnaire: this.EdiaryQuestionnaire,
                            Order: this.Order,
                            Id: route.QuestionId
                        });
                        e = q.entryResponses();
                        if (arrayContains(e, route.EnteredValue)) {
                            //check if the questionnaire should end
                            if (!route.CompleteQuestionnaire) {
                                result = route.NavigateTo;
                            } else {
                                questionnaireComplete = true;
                            }

                            break;
                        }
                    } else {
                        //run the navigation function to get a destination
                        result = route.NavigateTo();
                        break;
                    }
                }
            }
        }
        //default to the next sequence number
        if (result == null && !questionnaireComplete) {
            result = (typeof questionController.questions[this.EdiaryQuestionnaire][this.Order + 1] != 'undefined') ? this.Order + 1 : null;
        }
        return result;
    };
    this.getPreviousQuestionId = function () {
        var questionPagesViewed = questionController.questionPagesViewed;
        var result = null;
        var len = questionPagesViewed.length;

        if (len > 1) {
            result = questionPagesViewed[len - 2];
        } else {
            result = (typeof questionController.questions[this.EdiaryQuestionnaire][this.Order - 1] != 'undefined') ? this.Order - 1 : null;
        }
        return result;
    };

    this.hasGroupedQuestions = function () {
        var questionPage = questionController.getLoadedQuestionPage(this.EdiaryQuestionnaire, this.Order);
        return questionPage.length > 1;
    };

    this.isFirstGroupedQuestion = function () {
        var result = false;
        var questionPage = questionController.getLoadedQuestionPage(this.EdiaryQuestionnaire, this.Order);
        if (questionPage.length > 0) {
            result = questionPage[0].Id == this.Id;
        }
        return result;
    };

    this.valid = function () {
        //check for answers
        var responses = this.entryResponses();
        //displayObject(responses);
        //alert(this.IsRequired);
        //TODO:::!!!!!THIS IS a test
        //return true;
        return responses.length > 0 || this.IsRequired.toLowerCase() == 'false';
    };

    this.hasOptions = function () {
        return typeof this.Options != 'undefined' && this.Options != null && this.Options.length > 0;
    };

    this.renderQuestionHTML = function () {
        var htmlObject;

        switch (this.EdiaryInputFieldType) {
            case 1: //slider
                htmlObject = this.renderSliderControl();
                break;
            case 3: //radiobutton
            case "Radiobutton":
                htmlObject = this.renderRadioButtonControl();
                break;
            case 8:
            case "Number":
                htmlObject = this.renderNumberControl();
                break;
            case 10: //none
            case "None":
                htmlObject = this.renderNoneControl();
                break;
            case 11: //NRS
            case "NRS":
                htmlObject = this.renderNRSControl();
                break;
            case "DropdownList":
                htmlObject = this.renderDropDownListControl();
                break;
            case 15: //radiobutton plain
            case "PlainRadiobutton":
                htmlObject = this.renderPlainRadioButtonControl();
                break;
            case 16:
            case "CustomScreen":
                htmlObject = this.renderCustomScreen();
                break;
            case 17: //horizontal radiobutton
                htmlObject = this.renderHorizontalRadioButtonControl();
                break;
            default:
                htmlObject = this.renderGenericControl();
                break;
        }
        return htmlObject;
    };

    /***********************************************
    UI Controls
    ************************************************/
    this.renderControlBaseObject = function () {
        var pars = { 'class': 'question-text-wrapper' };
        pars[questionIdAttribute] = this.id; //mark the control as a question
        var obj = uiController.createControl('div', pars); //this is much faster than jquery create
        obj.setAttribute('id', this.controlDivId());
        var innerPars = { 'class': (this.isFirstGroupedQuestion() ? 'question-text' : '') };
        var textWrapper = uiController.createControl('div', innerPars);
        var txt = translationController.get(this.Text);
        $(textWrapper).html(txt);
        obj.appendChild(textWrapper);
        return obj;
    };
    this.appendHtmlInput = function (obj, input) {
        var pars = { 'class': this.hasGroupedQuestions() ? '' : 'question-response' };
        var wrapper = uiController.createControl('div', pars);
        wrapper.appendChild(input);
        obj.appendChild(wrapper);
    };

    this.bindInitEvent = function (obj, event) {
        //this binds an event to the main object that gets called when jquery mobile refreshes the screen
        $(obj).unbind(customQuestionCreateEvent);
        $(obj).bind(customQuestionCreateEvent, function () { event(this); });
        $(obj).attr(customQuestionCreateAttribute, 'true');
    };

    this.renderGenericControl = function () {
        var obj = this.renderControlBaseObject();
        var input = uiController.createInputControl(this.controlInputId(), { type: 'text' });

        //load defaults
        //add the element
        this.appendHtmlInput(obj, input);

        //attach events
        screenController.initControlValue(obj, 'QuestionResponse');

        return obj;
    };

    this.renderSliderControl = function () {
        var obj = this.renderControlBaseObject();
        var input = uiController.createInputControl(this.controlInputId(), { type: 'text' });

        //load defaults
        //add the element
        this.appendHtmlInput(obj, input);
        //attach events
        screenController.initControlValue(obj, 'QuestionResponse');

        return obj;
    };

    this.renderNumberControl = function () {
        var obj = this.renderControlBaseObject();
        var maxValue = this.MaxValue;
        var minValue = this.MinValue;
        var inputWrapper = uiController.createControl('div', { 'class': 'number-picker' });

        function createDigitControl(question) {
            var innerWrapper = uiController.createControl('div', {});
            var input = uiController.createInputControl(question.controlInputId(), { type: 'number', 'data-role': 'none', 'disabled': 'disabled', MinValue: minValue, MaxValue: maxValue });
            var btnUp = uiController.createControl('button', { value: 'Up', 'InputId': question.controlInputId() });
            var upIcon = uiController.createControl('i', { 'class': 'fa fa-caret-up fa-3x' });

            input.setAttribute(questionIdAttribute, this.Id);

            btnUp.appendChild(upIcon);

            $(btnUp).bind('tap', function () {
                var obj = $(this).next();
                var val = $(obj).val();
                var newValue = parseInt(val == '' ? 0 : val) + 1
                var maxValue = parseInt($(this).next().attr('MaxValue'));

                if (newValue <= maxValue) {
                    $(obj).val(newValue);
                    $(obj).trigger('keyup.yprime'); //retain value in answers object
                }
            });

            var btnDown = uiController.createControl('button', { value: 'Down', 'InputId': question.controlInputId() });
            var downIcon = uiController.createControl('i', { 'class': 'fa fa-caret-down fa-3x' });

            btnDown.appendChild(downIcon);

            $(btnDown).bind('tap', function () {
                var obj = $(this).prev();
                var val = $(obj).val();
                var newValue = parseInt(val == '' ? 1 : val) - 1
                var minValue = parseInt($(this).prev().attr('MinValue'));

                if (newValue >= minValue) {
                    $(obj).val(newValue);
                    $(obj).trigger('keyup.yprime'); //retain value in answers object
                }
            });

            innerWrapper.appendChild(btnUp);
            innerWrapper.appendChild(input);
            innerWrapper.appendChild(btnDown);

            return innerWrapper;
        }

        inputWrapper.appendChild(createDigitControl(this));

        this.appendHtmlInput(obj, inputWrapper);

        //attach events
        screenController.initControlValue(obj, 'QuestionResponse');
        return obj;
    };

    this.renderNoneControl = function () {
        var obj = this.renderControlBaseObject();
        //TODO: does this need to be recorded??

        return obj;
    };
    this.createRadioButtonControl = function (parent, options, skipTranslate) {
        var inputWrapper = uiController.createControl('div', {});

        for (var i = 0; i < options.length; i++) {
            var option = options[i];
            var input = uiController.createInputControl(
                this.controlInputId() + questionDelimiter + option.Text,
                {
                    type: 'radio',
                    name: this.controlInputId(),
                    id: this.controlInputId() + questionDelimiter + option.Text,
                    value: option.Value
                }
            );
            input.setAttribute(questionIdAttribute, this.Id);
            var label = document.createElement('label');
            label.setAttribute('for', this.controlInputId() + questionDelimiter + option.Text);
            $(label).html(skipTranslate ? option.Text : translationController.get(option.Text));
            inputWrapper.appendChild(input);
            inputWrapper.appendChild(label);
        }

        parent.appendChild(inputWrapper);
    };

    this.renderRadioButtonControl = function () {
        var obj = this.renderControlBaseObject();
        var opts = this.Options;
        var inputWrapper = uiController.createControl('div', {});

        this.createRadioButtonControl(inputWrapper, opts);
        this.appendHtmlInput(obj, inputWrapper);

        //attach events
        screenController.initControlValue(obj, 'QuestionResponse');
        return obj;
    };

    this.renderPlainRadioButtonControl = function () {
        var obj = this.renderRadioButtonControl();
        $(obj).addClass('plain-radio');
        screenController.initControlValue(obj, 'QuestionResponse');
        return obj;
    };

    this.renderHorizontalRadioButtonControl = function () {
        var obj = this.renderControlBaseObject();
        var fieldset = uiController.createControl('fieldset', {
            id: this.controlInputId(),
            "data-role": "controlgroup",
            "data-type": "horizontal",
            "data-mini": "true"
        });

        $(obj).addClass('horizontal-radio');

        var opts = this.Options;
        var optionLength = getObjectPropertyCount(opts);

        this.createRadioButtonControl(fieldset, opts);
        this.appendHtmlInput(obj, fieldset);

        screenController.initControlValue(obj, 'QuestionResponse');

        var fnInit = function (obj) {
            var t = $(obj).find('.ui-radio');
            $(obj).find('.ui-radio').each(function () {
                if (optionLength > 0) {
                    $(this).css('width', (100 / optionLength) + '%');
                }
            });
        };

        this.bindInitEvent(obj, fnInit);

        return obj;
    };

    this.renderNRSControl = function () {
        var obj = this.renderControlBaseObject();
        var fieldset = uiController.createControl('fieldset', {
            id: this.controlInputId(),
            "data-role": "controlgroup",
            "data-type": "horizontal",
            "data-mini": "true",
            "class": "NRS-fieldset"
        });

        var opts = this.Options;
        //alter the text to always be a numeric

        var alteredOpts = {};
        var optionLength = 0;
        for (var p in opts) {
            alteredOpts[opts[p]] = opts[p];
            optionLength++;
        }
        this.createRadioButtonControl(fieldset, opts, false);

        //create the lower labels
        var clearDiv = uiController.createControl('div', { "class": "clear" });

        var leftDiv = uiController.createControl('div', { "class": "left NRS-label" });
        var leftLabel = uiController.createControl('label', {});
        var leftImg = uiController.createControl('img', { src: "res/img/triangle.png" });

        $(leftLabel).html(translationController.get(this.MinValueText));
        $(leftDiv).append(leftImg);
        $(leftDiv).append(leftLabel);

        var rightDiv = uiController.createControl('div', { "class": "right NRS-label" });
        var rightLabel = uiController.createControl('label', {});
        var rightImg = uiController.createControl('img', { src: "res/img/triangle.png" });

        $(rightLabel).html(translationController.get(this.MaxValueText));
        $(rightDiv).append(rightImg);
        $(rightDiv).append(rightLabel);

        //load defaults
        //add the element
        fieldset.appendChild(clearDiv);
        fieldset.appendChild(leftDiv);
        fieldset.appendChild(rightDiv);

        this.appendHtmlInput(obj, fieldset);

        //attach events
        screenController.initControlValue(obj, 'QuestionResponse');

        var fnInit = function (obj) {
            $(obj).find('.ui-radio').each(function () {
                if (optionLength > 0) {
                    $(this).css('width', (100 / optionLength) + '%');
                }
            });
        };

        this.bindInitEvent(obj, fnInit);

        return obj;
    };

    this.renderDropDownListControl = function () {
        var obj = this.renderControlBaseObject();
        var opts = this.Options;
        var pars = {
            id: this.controlInputId(),
            "data-role": "none", //render native from jqm
            "class": "select-control"
        };
        pars[questionIdAttribute] = this.Id;
        var select = uiController.createControl('select', pars);

        //add a blank option to force a selection
        select.appendChild(uiController.createControl('option', { value: '' }));
        for (var i = 0; i < opts.length; i++) {
            var option = uiController.createControl('option', { value: opts[i].Value });
            $(option).html(translationController.get(opts[i].Text));
            select.appendChild(option);
        }
        //load defaults
        //add the element
        this.appendHtmlInput(obj, select);

        //attach events
        screenController.initControlValue(obj, 'QuestionResponse');

        return obj;
    };

    this.renderCustomScreen = function () {
        var id = this.controlDivId();
        var textid = this.Text;
        var obj = uiController.createControl('div', {
            'id': this.controlDivId(),
            'class': 'custom-question-screen'
        });

        function fnInit(obj) {
            $(obj).removeAttr(customQuestionCreateAttribute);
            var fn = function () {
                screenController.initControlValue($('#' + id), 'QuestionResponse');
            };
            //changeScreen: function (screenName, title, backgroundCSS, contentDivOverloadObject, onSuccess, pars)
            screenController.changeScreen(textid, null, null, obj, fn);
        };

        this.bindInitEvent(obj, fnInit);


        return obj;
    };

    this.load(obj, onSuccess, onError);
}
/*
CREATE TABLE questions (
    id unique
    , textid
    , type
    , sortorder
    , itemlist
    ,inputfieldtype
    ,isrequired
)
*/