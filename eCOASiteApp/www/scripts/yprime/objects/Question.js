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
var questionSecondDelimiter = '-';
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
            case 2:
            case "Checkbox":
                htmlObject = this.renderCheckBox();
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
            case 12: // Time COntrol
            case "Time":
                htmlObject = this.renderTimeControl();
                break;
            case "DropdownList":
                htmlObject = this.renderDropDownListControl();
                break;
            case 15: //radiobutton plain
            case "PlainRadiobutton":
                htmlObject = this.renderPlainRadioButtonControl();
                break;
            case "RadiobuttonCheckbox":
                htmlObject = this.renderRadioButtonCheckboxControl();
                break;
            case 16:
            case "CustomScreen":
                htmlObject = this.renderCustomScreen();
                break;
            case 17: //horizontal radiobutton
            case "HorizontalRadiobutton":
                htmlObject = this.renderHorizontalRadioButtonControl();
                break;
            case 18:
            case "CheckboxList":
                htmlObject = this.renderCheckBoxList();
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
        var pars = { 'class': 'question-text-wrapper ' + this.EdiaryQuestionnaire };
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

        //determine the right margin for the control
        var rightMarginEM = 0;
        switch ((this.MaxValue + '').length) {
            case 1:
                rightMarginEM = 1;
                break;
            case 2:
                rightMarginEM = 2;
                break;
        }
        var inputWrapper = uiController.createControl('div', { 'class': 'number-picker', 'style': 'margin-right:' + rightMarginEM + 'em;' });

        var questionControlInputId = this.controlInputId();
        var hiddenPars = {
            type: 'hidden'
        };
        hiddenPars[questionIdAttribute] = this.Id;
        var hiddenInput = uiController.createInputControl(questionControlInputId, hiddenPars);

        function createDigitControl(questionInputId, position, minValue, maxValue) {
            var innerWrapper = uiController.createControl('div', {});
            var displayInputId = questionInputId + questionSecondDelimiter + position;
            var input = uiController.createInputControl(displayInputId, {
                type: 'number',
                'data-role': 'none',
                'disabled': 'disabled',
                MinValue: minValue,
                MaxValue: maxValue,
                position: position,
                "class": questionInputId //use this to pull all the controls
            });
            //create the UP button
            var btnUp = uiController.createControl('button', { value: 'Up', 'InputId': displayInputId, 'QuestionInputId': questionInputId, position: position });
            var upIcon = uiController.createControl('i', { 'class': 'fa fa-caret-up fa-3x' });

            //input.setAttribute(questionIdAttribute, this.Id);
            btnUp.appendChild(upIcon);

            //create the DOWN button
            var btnDown = uiController.createControl('button', { value: 'Down', 'InputId': displayInputId, 'QuestionInputId': questionInputId, position: position });
            var downIcon = uiController.createControl('i', { 'class': 'fa fa-caret-down fa-3x' });

            btnDown.appendChild(downIcon);

            function numberButtonClickHandler(clickObject, up) {
                var questionInputId = $(clickObject).attr('QuestionInputId');
                var position = $(clickObject).attr('position');
                var obj = $('#' + questionInputId + questionSecondDelimiter + position);
                var val = $(obj).val();
                var newValue = parseInt(val == '' ? 0 : val) + (up ? 1 : -1);
                var minValue = parseInt($(clickObject).prev().attr('MinValue'));
                var maxValue = parseInt($(clickObject).next().attr('MaxValue'));
                var fullValue = getFullControlValue(position, up);

                if ((fullValue <= maxValue && newValue <= 9 && up) || (fullValue >= minValue && newValue >= 0 && !up)) {
                    //if ((newValue <= maxValue && up) || (newValue >= minValue && !up)) {
                    $(obj).val(newValue);
                    $(obj).trigger('keyup.yprime'); //retain value in answers object
                    updateHiddenControl(fullValue);
                }
            }

            function getFullControlValue(digit, up) {
                var values = $('.' + questionInputId);
                var mainValue = "";
                var foundValue = false;
                for (var j = values.length; j > 0; j--) {
                    var digitControl = $('#' + questionInputId + questionSecondDelimiter + j)
                    var digitValue = $(digitControl).val();
                    if (j == digit) {
                        if (digitValue != '') {
                            digitValue = (digitValue * 1) + (up ? 1 : -1);
                        } else {
                            digitValue = '0';
                        }
                    }
                    if (digitValue != '') {
                        foundValue = true;
                    }
                    if (foundValue && digitValue == '') {
                        $(digitControl).val('0').trigger('keyup.yprime');
                        digitValue = '0';
                    }
                    mainValue += digitValue;
                }
                mainValue = mainValue == '' ? 0 : mainValue * 1;
                return mainValue;
            }

            function updateHiddenControl(mainValue) {
                var obj = $('#' + questionInputId);

                $(obj).val(mainValue);
                $(obj).trigger('keyup.yprime');
            }

            //wire up the events
            $(btnUp).bind('tap', function () {
                numberButtonClickHandler(this, true);
            });

            $(btnDown).bind('tap', function () {
                numberButtonClickHandler(this, false);
            });

            innerWrapper.appendChild(btnUp);
            innerWrapper.appendChild(input);
            innerWrapper.appendChild(btnDown);

            return innerWrapper;
        }

        //this is float: right, so the controls are added in reverse
        if (typeof this.InputDisplayText != 'undefined' && this.InputDisplayText != null && this.InputDisplayText != '') {
            //add a translation to the control
            var inputDisplay = uiController.createControl('div', { "class": "number-picker-description" });
            inputDisplay.innerHTML = translationController.get(this.InputDisplayText);
            inputWrapper.appendChild(inputDisplay);
        }

        var maxValueString = reverse((this.MaxValue + ''));
        var len = maxValueString.length;
        for (var i = 0; i < len; i++) {
            var minValue = 0;
            var maxValue = 9;
            if (i == (len - 1)) {
                maxValue = maxValueString[i];
            }
            inputWrapper.appendChild(createDigitControl(questionControlInputId, i + 1, this.MinValue, this.MaxValue));
        }

        //clear the float left
        inputWrapper.appendChild(uiController.createControl('div', { "class": "clear" }));
        inputWrapper.appendChild(hiddenInput);

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

    this.renderRadioButtonCheckboxControl = function () {
        var obj = this.renderRadioButtonControl();
        $(obj).addClass('radio-checkbox');
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
        var leftImg = uiController.createControl('img', { src: "./images/triangle.png" });

        $(leftLabel).html(translationController.get(this.MinValueText));
        $(leftDiv).append(leftImg);
        $(leftDiv).append(leftLabel);

        var rightDiv = uiController.createControl('div', { "class": "right NRS-label" });
        var rightLabel = uiController.createControl('label', {});
        var rightImg = uiController.createControl('img', { src: "./images/triangle.png" });

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
        var questionId = this.Id;
        var id = this.controlDivId();
        var inputId = this.controlInputId();
        var textid = this.Text;
        var isLandscapeOrientation = this.IsLandscapeOrientation;
        var obj = uiController.createControl('div', {
            'id': this.controlDivId(),
            'class': 'custom-question-screen'
        });

        function fnInit(obj) {
            $(obj).removeAttr(customQuestionCreateAttribute);
            var fn = function () {
                //this control will ultimately hold the question value
                //it can be get and set from CustomScreenController.js
                //jo 25Jan2016
                var pars = { type: 'hidden', "class": customQuestionInputAttribute };
                pars[questionIdAttribute] = questionId;
                var input = uiController.createInputControl(inputId, pars);
                screenController.initInputDefaults(input, 'QuestionResponse');
                obj.appendChild(input);
            };
            screenController.changeScreen(textid, null, null, obj, fn, {}, isLandscapeOrientation);
        };

        this.bindInitEvent(obj, fnInit);

        return obj;
    };

    this.renderCheckBox = function () {
        var obj = uiController.createControl('div', {});
        var checkboxId = this.controlInputId();
        var checkPars = { type: "checkbox", id: checkboxId, name: checkboxId };
        checkPars[questionIdAttribute] = this.Id;
        checkPars[controlTypeAttribute] = 'checkbox-single';
        var check = uiController.createControl('input', checkPars);
        var label = uiController.createControl('label', { "for": checkboxId })
        $(label).html(translationController.get(this.Text));
        obj.appendChild(check);
        obj.appendChild(label);

        //attach events
        screenController.initInputDefaults(obj, 'QuestionResponse');

        function init(obj) {
            //make sure there is an answer for false AND for true
            $(obj).find('input[type="checkbox"]').each(function () {
                $(this).trigger("change.yprime");
                //screenController.inputChangeHandler(this);
            });

        }

        this.bindInitEvent(obj, init);

        return obj;
    };

    this.renderCheckBoxList = function () {
        var obj = this.renderControlBaseObject();
        var opts = this.Options;
        var pars = {
            id: this.controlInputId(),
            "data-role": "controlgroup", //render native from jqm
            "class": "select-control"
        };
        pars[questionIdAttribute] = this.Id;
        var checkboxGroup = uiController.createControl('fieldset', pars);

        for (var i = 0; i < opts.length; i++) {
            var checkboxId = this.controlInputId() + '_' + opts[i].Value;
            var checkPars = { type: "checkbox", checkValue: opts[i].Value, id: checkboxId, name: this.controlInputId() };
            checkPars[questionIdAttribute] = this.Id;
            checkPars[controlTypeAttribute] = 'checkbox-list';
            var check = uiController.createControl('input', checkPars);
            var label = uiController.createControl('label', { "for": checkboxId })
            $(label).html(translationController.get(opts[i].Text));
            checkboxGroup.appendChild(check);
            checkboxGroup.appendChild(label);
        }
        //load defaults
        //add the element
        this.appendHtmlInput(obj, checkboxGroup);

        //attach events
        screenController.initInputDefaults(obj, 'QuestionResponse');

        return obj;
        /*
         <fieldset data-role="controlgroup">
        <input type="checkbox" name="checkbox-v-2a" id="checkbox-v-2a">
        <label for="checkbox-v-2a">One</label>
        <input type="checkbox" name="checkbox-v-2b" id="checkbox-v-2b">
        <label for="checkbox-v-2b">Two</label>
        <input type="checkbox" name="checkbox-v-2c" id="checkbox-v-2c">
        <label for="checkbox-v-2c">Three</label>
    </fieldset>
        */
    };

    this.renderTimeControl = function () {
        var obj = this.renderControlBaseObject();
        var opts = this.Options;
        var pars = {
            id: this.controlInputId(),
            "data-role": "none", //render native from jqm
            "class": "time-control"
        };
        pars[questionIdAttribute] = this.Id;


        var tbl = uiController.createTableControl(3, 4);
        $(tbl).addClass("TimeControl full-width");

        var Btn = uiController.createControl("button", { "onclick": "Increment('TimeControl1', '" + this.controlInputId() + "')" });

        var UpImg = uiController.createControl("img", { "src": "../../res/css//images/icons-png/plus-black.png" });
        Btn.appendChild(UpImg);

        var Cell = $(tbl).find("td[rowIndex=0][colIndex=0]")[0];
        Cell.appendChild(Btn);

        Btn = uiController.createControl("button", { "onclick": "Increment('TimeControl3', '" + this.controlInputId() + "')" });
        UpImg = uiController.createControl("img", { "src": "../../res/css//images/icons-png/plus-black.png" });
        Btn.appendChild(UpImg);

        Cell = $(tbl).find("td[rowIndex=0][colIndex=2]")[0];
        Cell.appendChild(Btn);

        Btn = uiController.createControl("button", { "class": "selected" });
        var Span = uiController.createControl("span");
        $(Span).text("AM");
        Btn.appendChild(Span);

        Cell = $(tbl).find("td[rowIndex=0][colIndex=3]")[0];
        Cell.appendChild(Btn);
        Btn = uiController.createControl("button");
        var Span = uiController.createControl("span");
        $(Span).text("PM");
        Btn.appendChild(Span);

        Cell.appendChild(Btn);
        $(Cell).attr("rowspan", "3");

        Cell = $(tbl).find("td[rowIndex=1][colIndex=0]")[0];
        var Div = uiController.createControl("div", { "id": "TimeControl1", "min-value": "1", "max-value": "12", "left-padding": "1", "rollover": "true" });
        $(Div).text("9");
        Cell.appendChild(Div);

        Cell = $(tbl).find("td[rowIndex=1][colIndex=1]")[0];
        var Div = uiController.createControl("div", { "id": "TimeControl1", "min-value": "1", "max-value": "12", "left-padding": "1", "rollover": "true" });
        $(Div).text(":");
        Cell.appendChild(Div);

        Cell = $(tbl).find("td[rowIndex=1][colIndex=2]")[0];
        Div = uiController.createControl("div", { "id": "TimeControl3", "min-value": "1", "max-value": "59", "left-padding": "2", "rollover": "true" });
        $(Div).text("00");
        Cell.appendChild(Div);

        Btn = uiController.createControl("button", { "onclick": "Decrement('TimeControl1', '" + this.controlInputId() + "')" });
        var DownImg = uiController.createControl("img", { "src": "../../res/css//images/icons-png/minus-black.png" });
        Btn.appendChild(DownImg);
        Cell = $(tbl).find("td[rowIndex=2][colIndex=0]")[0];
        Cell.appendChild(Btn);

        Btn = uiController.createControl("button", { "onclick": "Decrement('TimeControl3', '" + this.controlInputId() + "')" });
        DownImg = uiController.createControl("img", { "src": "../../res/css//images/icons-png/minus-black.png" });
        Btn.appendChild(DownImg);
        Cell = $(tbl).find("td[rowIndex=2][colIndex=2]")[0];
        Cell.appendChild(Btn);

        obj.appendChild(tbl);
        // Add a hidden input field to contain the actual answer.
        var pars = {
            id: this.controlInputId(),
            "data-role": "none", //render native from jqm
            "class": "select-control",
            "style": "visibility:hidden;"
        };
        pars[questionIdAttribute] = this.Id;

        var id = this.controlInputId();
        var Input = uiController.createInputControl(id, pars);

        //var Input = uiController.createControl("input", { "id": "DoseTime", "type": "text" });
        function fnInit(obj) {
            //debugger;
            function ReloadSelectedTime() {
                //stubbed out
            }

            screenController.initControlValue($('#' + id), 'QuestionResponse');
            ReloadSelectedTime(id);
            //changeScreen: function (screenName, title, backgroundCSS, contentDivOverloadObject, onSuccess, pars)
            //screenController.changeScreen(textid, null, null, obj, fn);
        };

        this.bindInitEvent(Input, fnInit);

        obj.appendChild(Input);

        screenController.initControlValue(obj, 'QuestionResponse');

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