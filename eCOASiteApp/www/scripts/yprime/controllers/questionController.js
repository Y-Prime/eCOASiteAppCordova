/***********************
File: 			questionController.js
Date: 			05Nov2015
Created: 		J Osifchin
Description: 	control for questions
***************************/
var questionController = (function () {
    return {
        questions: {},
        instructions: {
            'Training': {
                '13': {
                    Routes: [
                        {
                            QuestionId: 204,
                            EnteredValue: 1, //ready
                            NavigateTo: null,//16,
                            CompleteQuestionnaire: true
                        },
                        {
                            QuestionId: 204,
                            EnteredValue: 0, //not ready
                            NavigateTo: 14,
                            CompleteQuestionnaire: false
                        }
                    ]
                },
                '14': {
                    Routes: [
                        {
                            QuestionId: 205,
                            EnteredValue: 1, //repeat
                            NavigateTo: 1
                        },
                        {
                            QuestionId: 205,
                            EnteredValue: 2, //help
                            NavigateTo: 15
                        }
                    ]
                }
            },
            'Daily_Diary': {
                '3': {
                    Routes: [
                        {
                            QuestionId: 173,
                            EnteredValue: null,
                            NavigateTo: function () { return questionController.instructions.checkStatusNavigate(173) }
                        }
                    ]
                },
                '5': {
                    Routes: [
                        {
                            QuestionId: 175,
                            EnteredValue: null,
                            NavigateTo: function () { return questionController.instructions.checkStatusNavigate(175) }
                        }
                    ]
                },
                '7': {
                    Routes: [
                        {
                            QuestionId: 264,
                            EnteredValue: 1, //took medicine
                            NavigateTo: 8,
                            CompleteQuestionnaire: false
                        },
                        {
                            QuestionId: 264,
                            EnteredValue: 0, //skipped dose
                            NavigateTo: null,
                            CompleteQuestionnaire: true
                        }
                    ]
                }
            },
            checkStatusNavigate: function (questionid) {
                //check the current patient status and return the correct page #
                var currentStatusId = currentPatientObject.getCurrentStatus();
                var navigatePage = null;
                var statusRequiresBagList = [-1, 8, 10];
                var requiresBag = arrayContains(statusRequiresBagList, currentStatusId);
                var question = questionController.getQuestionById('Daily_Diary', questionid);
                var questionAnswer = question.entryResponses()[0];
                var skippedDose = questionAnswer == 0;

                switch (questionid) {
                    case 173:
                        //5 if status not in list
                        navigatePage = requiresBag && !skippedDose ? 4 : 5;
                        break;
                    case 175:
                        navigatePage = requiresBag && !skippedDose ? 6 : 7;
                        break;
                }
                //return questionid == 173 ? 5 : 7;
                return navigatePage;
            }
        },

        /*
        Daily_Diary
	PAGE: 3
		173 -> check status 
			174 or 175
	PAGE: 5
		175 -> check status
			176 or 264 

*/

        questionPagesViewed: [],
        init: function (onSuccess, onError) {
            //load the questions from the db
            this.loadQuestionsFromDatabase(onSuccess, onError);
        },
        loadQuestionsFromDatabase: function (onSuccess, onError) {
            var sql = 'SELECT q.*, o.Id as OptionId, o.EdiaryQuestionId, o.Text as OptionText, o.Value as OptionValue, o.[Order] as OptionOrder FROM EDiaryQuestion q LEFT JOIN EDiaryOption o ON q.Id = o.EdiaryQuestionId ORDER BY q.[EdiaryQuestionnaire], q.[Order], q.[Text], CAST(o.[Order] AS INTEGER)';
            var pars = [];

            function fnLoadQuestions(rows) {
                questionController.questions = {};
                var currentQuestion = null;

                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var questionnaireName = row['EdiaryQuestionnaire'];
                    var order = row['Order'];

                    if (!questionController.questions[questionnaireName]) {
                        questionController.questions[questionnaireName] = {};
                    }
                    if (!questionController.questions[questionnaireName][order]) {
                        questionController.questions[questionnaireName][order] = [];
                    }
                    if (currentQuestion == null || currentQuestion['Id'] != row['Id']) {
                        if (currentQuestion != null) {
                            questionController.questions[currentQuestion.EdiaryQuestionnaire][currentQuestion.Order].push(currentQuestion);
                        }

                        currentQuestion = new Question({
                            Id: row['Id'],
                            EdiaryQuestionnaire: row['EdiaryQuestionnaire'],
                            EdiaryInputFieldType: row['EdiaryInputFieldType'],
                            Text: row['Text'],
                            InputDisplayText: row['InputDisplayText'],
                            Order: parseInt(row['Order']),
                            MinValue: row['MinValue'],
                            MinValueText: row['MinValueText'],
                            MaxValue: row['MaxValue'],
                            MaxValueText: row['MaxValueText'],
                            IsActive: row['IsActive'],
                            IsRequired: row['IsRequired'],
                            IsInstruction: row['IsInstruction'],
                            Group: row['Group'],
                            IsLandscapeOrientation: row['IsLandscapeOrientation'] == 'true' || row['IsLandscapeOrientation'] == true,
                            Options: []
                        });
                    }

                    if (row['OptionId']) {
                        currentQuestion.Options.push(
                            {
                                Order: row['OptionOrder'],
                                Text: row['OptionText'],
                                Value: row['OptionValue']
                            }
                        );
                    }

                }
                //get the last one
                if (currentQuestion != null) {
                    questionController.questions[questionnaireName][order].push(currentQuestion);
                }

                //displayObject(questionController.questions, false, true);
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            }

            dbController.executeSql(sql, pars, function (tx, rows) { fnLoadQuestions(rows); }, onError);
        },
        loadQuestionsFromService: function (onSuccess, onError) {
            function fnProcessData(data, onSuccess) {
                //displayObject(data);
                var sqlArray = [];
                var parameterArray = [];

                //clear previous questionnaires
                for (var i = 0; i < data.length; i++) {
                    var row = data[i];
                    var questionnaireName = row['QuestionnaireName'];

                    sqlArray.push('DELETE FROM EDiaryOption WHERE EdiaryQuestionId IN (SELECT Id FROM EDiaryQuestion WHERE EdiaryQuestionnaire = ?) ');
                    parameterArray.push([questionnaireName]);
                    sqlArray.push('DELETE FROM EDiaryQuestion WHERE EdiaryQuestionnaire = ?');
                    parameterArray.push([questionnaireName]);
                }

                for (var i = 0; i < data.length; i++) {
                    var row = data[i];
                    //row['EdiaryQuestionnaire'] = 'PHQ-8';
                    //TODO: add this to the DTO so it can be read in.
                    //row['MinValue'] = 0;
                    //row['MaxValue'] = 100;

                    row['QuestionnaireName'] = typeof row['QuestionnaireName'] != 'undefined' ? row['QuestionnaireName'] : 'Placeholder';

                    var pars = {
                        Id: row['Id'],
                        EdiaryQuestionnaire: row['QuestionnaireName'],
                        EdiaryInputFieldType: row['InputFieldType'],
                        Text: row['Text'],
                        InputDisplayText: row['InputDisplayText'],
                        Order: parseInt(row['Order']),
                        MinValue: row['MinValue'],
                        MinValueText: row['MinValueText'],
                        MaxValue: row['MaxValue'],
                        MaxValueText: row['MaxValueText'],
                        IsActive: row['IsActive'],
                        IsRequired: row['IsRequired'],
                        IsInstruction: row['IsInstruction'],
                        Group: row['Group'],
                        IsLandscapeOrientation: row['IsLandscapeOrientation']
                    };
                    var q = new Question(pars);
                    sqlArray.push(dbController.getInsertUpdateSql(q, 'EDiaryQuestion'));
                    parameterArray.push(dbController.getInsertUpdateParameters(q));

                    //load up the options table
                    var options = row['Options'];

                    for (var j = 0; j < options.length; j++) {
                        var option = options[j];
                        var optionPar = {
                            Id: option['Id'],
                            EdiaryQuestionId: row['Id'],
                            Text: option['Text'],
                            Value: option['Value'],
                            Order: option['Order']
                        };
                        sqlArray.push(dbController.getInsertUpdateSql(optionPar, 'EDiaryOption'));
                        parameterArray.push(dbController.getInsertUpdateParameters(optionPar));
                    }
                }

                dbController.executeSqlStatements(sqlArray, parameterArray, onSuccess);
            };

            if (serviceController.connected()) {
                serviceCalls.getQuestions(function (rows) { fnProcessData(rows, onSuccess); }, onError);
            } else {
                fnProcessData(debugQuestionRows(), onSuccess);
            }
        },
        startQuestionnaire: function (questionnaireName, visitNumber, skipSave, completedCallback, isTraining, exitScreen, exitTitle) {
            //render the first question of the type from the object
            questionnaireStartTime = getCurrentDate();
            currentVisitNumber = typeof visitNumber == 'undefined' || visitNumber == null ? -1 : visitNumber;
            saveCurrentQuestionnaire = typeof skipSave == 'undefined' || skipSave == null ? true : !skipSave;
            exitScreen = typeof exitScreen == 'undefined' || exitScreen == null ? null : exitScreen;
            exitTitle = typeof exitTitle == 'undefined' || exitTitle == null ? null : exitTitle;
            //NOTE: this function MUST have a callback!!!
            questionController.setQuestionnaireCompleteCallback(typeof completedCallback == 'function' ? completedCallback : null);
            questionController.setExitScreen(exitScreen, exitTitle);
            // questionnaireCompleteCallback = typeof completedCallback == 'function' ? completedCallback : null;
            var sortorder = this.getFirstQuestionSortOrder(questionnaireName);
            questionController.questionPagesViewed = []; //this holds the history of the questions viewed

            if (isTraining) {
                $('#main-content').addClass('training-border')
            }

            this.goToQuestion(questionnaireName, sortorder);
        },
        getQuestionnaireCompleteCallback: function () {
            return questionnaireCompleteCallback;
        },
        setQuestionnaireCompleteCallback: function (fn) {
            questionnaireCompleteCallback = fn;
        },
        getExitScreen: function () {
            return exitScreen;
        },
        setExitScreen: function (screenName, title) {
            exitScreen = { ScreenName: screenName, Title: title };
        },
        completeQuestionnaire: function (questionnaireName) {
            questionnaireCompletedTime = getCurrentDate();
            $('#main-content').removeClass('training-border');

            var questionnaireCallback = questionController.getQuestionnaireCompleteCallback();

            function questionnaireSavedToDBCallback() {
                screenController.clearInputDefaults();

                if (typeof questionnaireCallback == 'function') {
                    //push the call to the data success screen! - 31Jan2016
                    screenController.setDataTransferSuccessCallback(questionnaireCallback);
                    questionController.setQuestionnaireCompleteCallback(null);
                }
                screenController.changeScreen('DataSavedTransmit', '');
            }

            function completeQuestionnaireMain() {
                if (saveCurrentQuestionnaire) {
                    questionController.saveAnswersToDB(
                        questionnaireName,
                        questionnaireSavedToDBCallback,
                        null);
                } else {
                    screenController.clearInputDefaults();
                    //screenController.goToPreviousScreen();
                    questionController.checkExitScreen();
                    if (typeof questionnaireCallback == 'function') {
                        questionnaireCallback();
                    }
                }
            }

            // if (typeof questionnaireCallback == 'function') {
            //    questionnaireCallback(completeQuestionnaireMain);
            //} else {
            completeQuestionnaireMain();
            //}
        },
        checkExitScreen: function () {
            var exitScreenObject = questionController.getExitScreen();
            if (exitScreenObject.ScreenName == null) {
                screenController.goToPreviousScreen();
            } else {
                screenController.changeScreen(exitScreenObject.ScreenName, exitScreenObject.Title);
            }
        },
        saveAnswersToDB: function (questionnaireName, onSuccess, onError) {
            var id;
            var value;
            var sqlArray = [];
            var parameterArray = [];
            //insure valid date
            var diaryDate = moment(app.getDiaryDate()).isValid() ? app.getDiaryDate() : getCurrentDate();

            var entryObject = {
                Guid: dbController.getGuid(),
                PatientNumber: currentPatientObject.PatientNumber,
                DeviceMacAddress: app.getMacAddress(),
                Date: diaryDate,
                VisitId: currentVisitNumber,
                QuestionnaireName: questionnaireName,
                Status: 'Saved',
                Source: 'BYOD',
                Started: questionnaireStartTime,
                Completed: questionnaireCompletedTime,
                TransmitDate: null
            };

            sqlArray.push(dbController.getInsertUpdateSql(entryObject, 'EDiary'));
            parameterArray.push(dbController.getInsertUpdateParameters(entryObject));

            for (var p in answers) {
                var currentQuestion = null;
                var r = new RegExp(questionDelimiter);//p.match(/_/)
                if (p.match(r) && p.split(questionDelimiter)[0] == questionnaireName) {
                    id = p.split(questionDelimiter)[2];
                    value = answers[p];

                    var entryDetailObject = {
                        Guid: dbController.getGuid(),
                        EdiaryGuid: entryObject.Guid,
                        EdiaryQuestionId: id//,
                    };

                    //TODO: should this be by question type
                    //get the question from the array
                    //questionController.questions["Daily_Diary"]["2"][0].Options.length
                    var questions = questionController.questions[questionnaireName][p.split(questionDelimiter)[1]];
                    for (var i = 0; i < questions.length; i++) {
                        if (questions[i].Id == id) {
                            currentQuestion = questions[i];
                            break;
                        }
                    }

                    if ((currentQuestion != null && currentQuestion.hasOptions()) || (currentQuestion == null && isNumeric(value))) {
                        entryDetailObject['Value'] = value;
                    } else {
                        entryDetailObject['FreeTextAnswer'] = value;
                    }
                    sqlArray.push(dbController.getInsertUpdateSql(entryDetailObject, 'EDiaryDetail'));
                    parameterArray.push(dbController.getInsertUpdateParameters(entryDetailObject));
                }
            }

            dbController.executeSqlStatements(sqlArray, parameterArray, onSuccess, onError);
        },
        getUntransmittedEntriesSQL: function () {
            return "SELECT e.[Guid],e.[PatientNumber], e.[DeviceMacAddress], e.[Date], e.[VisitId], e.[QuestionnaireName], e.[Status], e.[Source], e.[Started], e.[Completed], d.[EdiaryQuestionId], d.[Value], d.[FreeTextAnswer] FROM EDiary e LEFT JOIN EDiaryDetail d ON e.Guid = d.EdiaryGuid WHERE e.[TransmitDate] = 'null' or e.[TransmitDate] is null";
        },
        getUntransmittedEntries: function (onSuccess, onError) {
            var sql = questionController.getUntransmittedEntriesSQL();//"SELECT e.[Guid],e.[PatientNumber], e.[DeviceMacAddress], e.[Date], e.[VisitNumber], e.[QuestionnaireName], e.[Status], e.[Source], e.[Started], e.[Completed], d.[EdiaryQuestionId], d.[Value], d.[FreeTextAnswer] FROM EDiary e LEFT JOIN EDiaryDetail d ON e.Guid = d.EdiaryGuid WHERE e.[TransmitDate] = 'null'";
            var pars = [];

            dbController.executeSql(sql, pars, onSuccess, onError);
        },
        transmitUnsentEntries: function (onSuccess, onError) {
            var sql = questionController.getUntransmittedEntriesSQL();//"SELECT e.[Guid],e.[PatientNumber], e.[DeviceMacAddress], e.[Date], e.[VisitNumber], e.[QuestionnaireName], e.[Status], e.[Source], e.[Started], e.[Completed], d.[EdiaryQuestionId], d.[Value], d.[FreeTextAnswer] FROM EDiary e LEFT JOIN EDiaryDetail d ON e.Guid = d.EdiaryGuid WHERE e.[TransmitDate] = 'null'";
            var pars = [];

            //TODO: this needs to continue running even on fail
            function fnProcess(tx, rows) {
                if (rows.length > 0) {
                    var entries = [];
                    var row;
                    var currentEntryGuid = null;
                    var entry = {};

                    for (var i = 0; i < rows.length; i++) {
                        row = rows[i];
                        if (currentEntryGuid == null || currentEntryGuid != row['Guid']) {
                            if (currentEntryGuid != null) {
                                entries.push(entry);
                            }
                            entry = {
                                Id: 0,
                                Guid: row['Guid'],
                                PatientNumber: row['PatientNumber'],
                                DeviceMacAddress: row['DeviceMacAddress'],
                                Date: serviceController.serializeDate(row['Date']),
                                Answers: [],
                                Status: row['Status'],
                                Source: row['Source'],
                                Started: serviceController.serializeDate(row['Started']),
                                Completed: serviceController.serializeDate(row['Completed']),
                                QuestionnaireName: row['QuestionnaireName'],
                                VisitId: row['VisitId']
                            };
                            currentEntryGuid = row['Guid'];
                        }
                        //add the answers
                        var answerObject = {
                            QuestionId: row['EdiaryQuestionId'],
                            Value: row['Value'],
                            FreeTextAnswer: row['FreeTextAnswer']
                        };
                        entry.Answers.push(answerObject);
                    }
                    //get the last one
                    entries.push(entry);

                    function fn(entries, onSuccess, onError) {
                        if (entries.length > 0) {
                            var entry = entries.pop();
                            serviceCalls.transmitEntry(
                                entry,
                                function () {
                                    questionController.setEntryAsTransmitted(entry.Guid, function () { fn(entries, onSuccess, onError); }
                                );
                                },
                                onError);
                        } else {
                            if (typeof onSuccess == 'function') {
                                onSuccess();
                            }
                        }
                    };
                    //send the entries
                    fn(entries, onSuccess, onError);
                } else {
                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                }
            };

            if (serviceController.connected()) {
                dbController.executeSql(sql, pars, fnProcess);
            } else {
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            }
        },
        setEntryAsTransmitted: function (guid, onSuccess, onError) {
            var sql = 'UPDATE EDiary SET TransmitDate=? WHERE Guid=?';
            var pars = [getCurrentDate(), guid];

            dbController.executeSql(sql, pars, onSuccess, onError);
        },
        goToQuestion: function (questionnaireName, sortOrder, isBackButton) {
            //render the first question of the type from the object
            //generate a screen
            var title = '';

            //check for custom screen
            var nextQuestionPage = this.getLoadedQuestionPage(questionnaireName, sortOrder);
            var nextQuestion = nextQuestionPage[0];
            var isLandscapeOrientation = false;
            var screen = 'QuestionResponse';
            
            for (var i = 0; i < nextQuestionPage.length; i++) {
                if (nextQuestionPage[i].IsLandscapeOrientation == true) {
                    isLandscapeOrientation = true;
                    break;  
                }
            }
            //var screen = 'QuestionResponse';

            //retain the history
            if (!isBackButton) {
                questionController.questionPagesViewed.push(sortOrder);
            } else {
                questionController.questionPagesViewed.pop();
            }

            screenController.changeScreen(
                screen,
                title,
                null,
                null,
                function () { },
                { typename: questionnaireName, sortorder: sortOrder },
                isLandscapeOrientation
                );
        },
        getFirstQuestionSortOrder: function (questionnaireName) {
            var list = this.questions[questionnaireName];
            var firstSort = 999999;
            for (var p in list) {
                if (parseInt(p) < firstSort) {
                    firstSort = parseInt(p);
                    if (firstSort == 1) {
                        break;
                    }
                }
            }

            return firstSort;
        },
        getLoadedQuestionPage: function (questionnaireName, sortOrder) {
            return questionController.questions[questionnaireName][sortOrder];
        },
        getQuestionById: function (questionnaireName, questionId) {
            var diary = questionController.questions[questionnaireName];
            var question = null;
            for (var page in diary) {
                for (var i = 0; i < diary[page].length; i++) {
                    if (diary[page][i].Id == questionId) {
                        question = diary[page][i];
                    }
                }
            }
            return question;
        },
        validQuestionPage: function (questionnaireName, sortOrder) {
            var page = this.getLoadedQuestionPage(questionnaireName, sortOrder);;
            var result = true;
            var messageKey = 'keyAnswerRequired'; 
            for (var i = 0; i < page.length; i++) {
                //this is OPC Specific !!! jo 14Jan2016
                if (page[i].Text == 'Training12') {
                    messageKey = 'keyIncorrectAnswer';
                    if (page[i].entryResponses()[0] != 1) {
                        result = false;
                        break;
                    }
                } else {
                    if (!page[i].valid()) {
                        result = false;
                        break;
                    }
                }

            }
            var message = translationController.get(messageKey);
            if (!result) {
                //TODO: get better error message
                app.alert(message);
            }
            return result;
        },
        renderQuestionPageHTML: function (questionPage) {
            var mainObject = uiController.createControl('div', {});
            for (var i = 0; i < questionPage.length; i++) {
                mainObject.appendChild(questionPage[i].renderQuestionHTML());
            }
            return mainObject;
        },
        createControl: function (type, options) {
            var ctrl = document.createElement(type);
            for (var p in options) {
                ctrl.setAttribute(p, options[p]);
            }
            return ctrl;
        },
        confirmExit: function (onSuccess) {
            var title = '';
            var message = translationController.get('keyConfirmExit');
            //pgConfirm(message, callback, title, buttons) 

            function confirmSuccess(idx) {
                $('#main-content').removeClass('training-border');
                if (typeof onSuccess == 'function') {
                    onSuccess(idx);
                }
            }

            pgConfirm(message, confirmSuccess, title, [translationController.get('keyOK'), translationController.get('keyCancel')]);
        },
        onExitConfirm: function (buttonIndex) {
            if (buttonIndex == 1) {

            }
        }

    };
})();


function debugQuestionRows() {
    var rows = [{ "Id": 171, "QuestionnaireName": "Daily_Diary", "Order": 6, "Text": "DailyDiary2", "Options": [{ "Id": 564, "Text": "key4", "Value": 4, "Order": 5 }, { "Id": 565, "Text": "key6", "Value": 6, "Order": 7 }, { "Id": 566, "Text": "key7", "Value": 7, "Order": 8 }, { "Id": 1648, "Text": "key10", "Value": 10, "Order": 11 }, { "Id": 3416, "Text": "key0", "Value": 0, "Order": 1 }, { "Id": 3417, "Text": "key1", "Value": 1, "Order": 2 }, { "Id": 3418, "Text": "key2", "Value": 2, "Order": 3 }, { "Id": 3419, "Text": "key3", "Value": 3, "Order": 4 }, { "Id": 3420, "Text": "key5", "Value": 5, "Order": 6 }, { "Id": 3421, "Text": "key8", "Value": 8, "Order": 9 }, { "Id": 3422, "Text": "key9", "Value": 9, "Order": 10 }], "InputFieldType": "NRS", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 177, "QuestionnaireName": "PHQ-8", "Order": 1, "Text": "PHQ81", "Options": [{ "Id": 584, "Text": "keynotatall", "Value": 1, "Order": 1 }, { "Id": 585, "Text": "keyseveral", "Value": 2, "Order": 2 }, { "Id": 586, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 3410, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 185, "QuestionnaireName": "Practice_Daily_Diary", "Order": 1, "Text": "PracticeDailyDiary1", "Options": [{ "Id": 616, "Text": "keyyes", "Value": 1, "Order": null }, { "Id": 617, "Text": "keyno", "Value": 0, "Order": null }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 192, "QuestionnaireName": "Training", "Order": 1, "Text": "Training1", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 221, "QuestionnaireName": "COWS", "Order": 1, "Text": "COWS1", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 222, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 1, "Text": "MOS1", "Options": [{ "Id": 3355, "Text": "key015", "Value": 1, "Order": 1 }, { "Id": 3356, "Text": "key1630", "Value": 2, "Order": 2 }, { "Id": 3357, "Text": "key3145", "Value": 3, "Order": 3 }, { "Id": 3358, "Text": "key4660", "Value": 4, "Order": 4 }, { "Id": 3359, "Text": "key60more", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 234, "QuestionnaireName": "PQAS", "Order": 1, "Text": "PQAS1", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 235, "QuestionnaireName": "SOWS", "Order": 1, "Text": "SOWS1", "Options": [{ "Id": 3431, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3432, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3433, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3434, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3435, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 172, "QuestionnaireName": "Daily_Diary", "Order": 2, "Text": "DailyDiary3", "Options": [{ "Id": 574, "Text": "key6", "Value": 6, "Order": 7 }, { "Id": 575, "Text": "key7", "Value": 7, "Order": 8 }, { "Id": 1656, "Text": "key9", "Value": 9, "Order": 10 }, { "Id": 3423, "Text": "key0", "Value": 0, "Order": 1 }, { "Id": 3424, "Text": "key1", "Value": 1, "Order": 2 }, { "Id": 3425, "Text": "key2", "Value": 2, "Order": 3 }, { "Id": 3426, "Text": "key3", "Value": 3, "Order": 4 }, { "Id": 3427, "Text": "key4", "Value": 4, "Order": 5 }, { "Id": 3428, "Text": "key5", "Value": 5, "Order": 6 }, { "Id": 3429, "Text": "key8", "Value": 8, "Order": 9 }, { "Id": 3430, "Text": "key10", "Value": 10, "Order": 11 }], "InputFieldType": "NRS", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 178, "QuestionnaireName": "PHQ-8", "Order": 2, "Text": "PHQ82", "Options": [{ "Id": 589, "Text": "keyseveral", "Value": 2, "Order": 2 }, { "Id": 590, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 591, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }, { "Id": 3411, "Text": "keynotatall", "Value": 1, "Order": 1 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 186, "QuestionnaireName": "Practice_Daily_Diary", "Order": 2, "Text": "PracticeDailyDiary2", "Options": [{ "Id": 618, "Text": "key0", "Value": 0, "Order": null }, { "Id": 619, "Text": "key1", "Value": 1, "Order": null }, { "Id": 620, "Text": "key2", "Value": 2, "Order": null }, { "Id": 621, "Text": "key3", "Value": 3, "Order": null }, { "Id": 622, "Text": "key4", "Value": 4, "Order": null }, { "Id": 623, "Text": "key6", "Value": 6, "Order": null }, { "Id": 624, "Text": "key7", "Value": 7, "Order": null }, { "Id": 625, "Text": "key8", "Value": 8, "Order": null }, { "Id": 626, "Text": "key9", "Value": 9, "Order": null }], "InputFieldType": "NRS", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 193, "QuestionnaireName": "Training", "Order": 2, "Text": "Training2", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 209, "QuestionnaireName": "COWS", "Order": 2, "Text": "COWS2", "Options": [], "InputFieldType": "Number", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 223, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 2, "Text": "MOS2", "Options": [], "InputFieldType": "Number", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 236, "QuestionnaireName": "SOWS", "Order": 2, "Text": "SOWS2", "Options": [{ "Id": 3436, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3437, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3438, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3439, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3440, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 173, "QuestionnaireName": "Daily_Diary", "Order": 3, "Text": "DailyDiary4", "Options": [{ "Id": 578, "Text": "keyyes", "Value": 1, "Order": 1 }, { "Id": 579, "Text": "keyno", "Value": 0, "Order": 2 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 179, "QuestionnaireName": "PHQ-8", "Order": 3, "Text": "PHQ83", "Options": [{ "Id": 593, "Text": "keyseveral", "Value": 2, "Order": 2 }, { "Id": 594, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 595, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }, { "Id": 3412, "Text": "keynotatall", "Value": 1, "Order": 1 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 187, "QuestionnaireName": "Practice_Daily_Diary", "Order": 3, "Text": "PracticeDailyDiary3", "Options": [{ "Id": 627, "Text": "key0", "Value": 0, "Order": null }, { "Id": 628, "Text": "key1", "Value": 1, "Order": null }, { "Id": 629, "Text": "key2", "Value": 2, "Order": null }, { "Id": 630, "Text": "key3", "Value": 3, "Order": null }, { "Id": 631, "Text": "key4", "Value": 4, "Order": null }, { "Id": 632, "Text": "key6", "Value": 6, "Order": null }, { "Id": 633, "Text": "key7", "Value": 7, "Order": null }, { "Id": 634, "Text": "key8", "Value": 8, "Order": null }, { "Id": 635, "Text": "key9", "Value": 9, "Order": null }], "InputFieldType": "NRS", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 194, "QuestionnaireName": "Training", "Order": 3, "Text": "Training3", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 210, "QuestionnaireName": "COWS", "Order": 3, "Text": "COWS3", "Options": [{ "Id": 3295, "Text": "key80below", "Value": 0, "Order": 1 }, { "Id": 3296, "Text": "key81100", "Value": 1, "Order": 2 }, { "Id": 3297, "Text": "key101120", "Value": 2, "Order": 3 }, { "Id": 3298, "Text": "keygreater120", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 224, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 3, "Text": "MOS3", "Options": [{ "Id": 3360, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3361, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3362, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3363, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3364, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 237, "QuestionnaireName": "SOWS", "Order": 3, "Text": "SOWS3", "Options": [{ "Id": 3441, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3442, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3443, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3444, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3445, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 174, "QuestionnaireName": "Daily_Diary", "Order": 4, "Text": "DailyDiary5", "Options": [{ "Id": 580, "Text": "keyyes", "Value": 1, "Order": 1 }, { "Id": 581, "Text": "keyno", "Value": 0, "Order": 2 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 180, "QuestionnaireName": "PHQ-8", "Order": 4, "Text": "PHQ84", "Options": [{ "Id": 597, "Text": "keyseveral", "Value": 2, "Order": 2 }, { "Id": 598, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 599, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }, { "Id": 3413, "Text": "keynotatall", "Value": 1, "Order": 1 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 188, "QuestionnaireName": "Practice_Daily_Diary", "Order": 4, "Text": "PracticeDailyDiary4", "Options": [{ "Id": 636, "Text": "keyyes", "Value": 1, "Order": null }, { "Id": 637, "Text": "keyno", "Value": 0, "Order": null }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 195, "QuestionnaireName": "Training", "Order": 4, "Text": "Training4", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 211, "QuestionnaireName": "COWS", "Order": 4, "Text": "COWS4", "Options": [{ "Id": 3299, "Text": "keynochills", "Value": 0, "Order": 1 }, { "Id": 3300, "Text": "keysubjectivechills", "Value": 1, "Order": 2 }, { "Id": 3301, "Text": "keyflushed", "Value": 2, "Order": 3 }, { "Id": 3302, "Text": "keysweat", "Value": 3, "Order": 4 }, { "Id": 3303, "Text": "keysweatstreaming", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 225, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 4, "Text": "MOS4", "Options": [{ "Id": 3365, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3366, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3367, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3368, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3369, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 238, "QuestionnaireName": "SOWS", "Order": 4, "Text": "SOWS4", "Options": [{ "Id": 3446, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3447, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3448, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3449, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3450, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 175, "QuestionnaireName": "Daily_Diary", "Order": 5, "Text": "DailyDiary6", "Options": [{ "Id": 582, "Text": "keyyes", "Value": 1, "Order": 1 }, { "Id": 583, "Text": "keyno", "Value": 0, "Order": 2 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 181, "QuestionnaireName": "PHQ-8", "Order": 5, "Text": "PHQ85", "Options": [{ "Id": 600, "Text": "keynotatall", "Value": 1, "Order": 1 }, { "Id": 601, "Text": "keyseveral", "Value": 2, "Order": 2 }, { "Id": 602, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 603, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 189, "QuestionnaireName": "Practice_Daily_Diary", "Order": 5, "Text": "PracticeDailyDiary5", "Options": [{ "Id": 638, "Text": "keyyes", "Value": 1, "Order": null }, { "Id": 639, "Text": "keyno", "Value": 0, "Order": null }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 196, "QuestionnaireName": "Training", "Order": 5, "Text": "Training5", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 212, "QuestionnaireName": "COWS", "Order": 5, "Text": "COWS5", "Options": [{ "Id": 3304, "Text": "keysitstill", "Value": 0, "Order": 1 }, { "Id": 3305, "Text": "keydifficultysitting", "Value": 1, "Order": 2 }, { "Id": 3306, "Text": "keyfrequentshifting", "Value": 3, "Order": 3 }, { "Id": 3307, "Text": "keyunablesit", "Value": 5, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 226, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 5, "Text": "MOS5", "Options": [{ "Id": 3370, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3371, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3372, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3373, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3374, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 239, "QuestionnaireName": "SOWS", "Order": 5, "Text": "SOWS5", "Options": [{ "Id": 3451, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3452, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3453, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3454, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3455, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 176, "QuestionnaireName": "Daily_Diary", "Order": 1, "Text": "DailyDiary7", MinValue: 1, MaxValue: 99, "Options": [], "InputFieldType": "Number", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 182, "QuestionnaireName": "PHQ-8", "Order": 6, "Text": "PHQ86", "Options": [{ "Id": 605, "Text": "keyseveral", "Value": 2, "Order": 2 }, { "Id": 606, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 607, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }, { "Id": 3414, "Text": "keynotatall", "Value": 1, "Order": 1 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 190, "QuestionnaireName": "Practice_Daily_Diary", "Order": 6, "Text": "PracticeDailyDiary6", "Options": [{ "Id": 640, "Text": "keyyes", "Value": 1, "Order": null }, { "Id": 641, "Text": "keyno", "Value": 0, "Order": null }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 197, "QuestionnaireName": "Training", "Order": 6, "Text": "Training6", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 213, "QuestionnaireName": "COWS", "Order": 6, "Text": "COWS6", "Options": [{ "Id": 3308, "Text": "keypupilsnormal", "Value": 0, "Order": 1 }, { "Id": 3309, "Text": "keypupilslarger", "Value": 1, "Order": 2 }, { "Id": 3310, "Text": "keypupilsdilated", "Value": 2, "Order": 3 }, { "Id": 3311, "Text": "keypupilsiris", "Value": 5, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 227, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 6, "Text": "MOS6", "Options": [{ "Id": 3375, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3376, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3377, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3378, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3379, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 240, "QuestionnaireName": "SOWS", "Order": 6, "Text": "SOWS6", "Options": [{ "Id": 3456, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3457, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3458, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3459, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3460, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 183, "QuestionnaireName": "PHQ-8", "Order": 7, "Text": "PHQ87", "Options": [{ "Id": 608, "Text": "keynotatall", "Value": 1, "Order": 1 }, { "Id": 609, "Text": "keyseveral", "Value": 2, "Order": 2 }, { "Id": 610, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 611, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 191, "QuestionnaireName": "Practice_Daily_Diary", "Order": 7, "Text": "PracticeDailyDiary7", "Options": [], "InputFieldType": "Number", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 198, "QuestionnaireName": "Training", "Order": 7, "Text": "Training7", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 214, "QuestionnaireName": "COWS", "Order": 7, "Text": "COWS7", "Options": [{ "Id": 3312, "Text": "keynotpresent", "Value": 0, "Order": 1 }, { "Id": 3313, "Text": "keymilddiscomfort", "Value": 1, "Order": 2 }, { "Id": 3314, "Text": "keyseverediffuse", "Value": 2, "Order": 3 }, { "Id": 3315, "Text": "keyrubbingjoints", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 228, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 7, "Text": "MOS7", "Options": [{ "Id": 3380, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3381, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3382, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3383, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3384, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 241, "QuestionnaireName": "SOWS", "Order": 7, "Text": "SOWS7", "Options": [{ "Id": 3461, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3462, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3463, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3464, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3465, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 184, "QuestionnaireName": "PHQ-8", "Order": 8, "Text": "PHQ88", "Options": [{ "Id": 612, "Text": "keynotatall", "Value": 1, "Order": 1 }, { "Id": 614, "Text": "keymorethanhalf", "Value": 3, "Order": 3 }, { "Id": 615, "Text": "keynearlyeveryday", "Value": 4, "Order": 4 }, { "Id": 3415, "Text": "keyseveral", "Value": 2, "Order": 2 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 199, "QuestionnaireName": "Training", "Order": 8, "Text": "Training8", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 215, "QuestionnaireName": "COWS", "Order": 8, "Text": "COWS8", "Options": [{ "Id": 3316, "Text": "keynotpresent", "Value": 0, "Order": 1 }, { "Id": 3317, "Text": "keystuffiness", "Value": 1, "Order": 2 }, { "Id": 3318, "Text": "keynoserunning", "Value": 2, "Order": 3 }, { "Id": 3319, "Text": "keyconstantrunning", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 229, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 8, "Text": "MOS8", "Options": [{ "Id": 3385, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3386, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3387, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3388, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3389, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 242, "QuestionnaireName": "SOWS", "Order": 8, "Text": "SOWS8", "Options": [{ "Id": 3466, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3467, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3468, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3469, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3470, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 200, "QuestionnaireName": "Training", "Order": 9, "Text": "Training9", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 216, "QuestionnaireName": "COWS", "Order": 9, "Text": "COWS9", "Options": [{ "Id": 3320, "Text": "keynoGI", "Value": 0, "Order": 1 }, { "Id": 3321, "Text": "keystomachcramps", "Value": 1, "Order": 2 }, { "Id": 3322, "Text": "keynausea", "Value": 2, "Order": 3 }, { "Id": 3323, "Text": "keyvomiting", "Value": 3, "Order": 4 }, { "Id": 3324, "Text": "keymultipleepisodes", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 230, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 9, "Text": "MOS9", "Options": [{ "Id": 3390, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3391, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3392, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3393, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3394, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 243, "QuestionnaireName": "SOWS", "Order": 9, "Text": "SOWS9", "Options": [{ "Id": 3471, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3472, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3473, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3474, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3475, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 201, "QuestionnaireName": "Training", "Order": 10, "Text": "Training10", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 217, "QuestionnaireName": "COWS", "Order": 10, "Text": "COWS10", "Options": [{ "Id": 3325, "Text": "keynotremor", "Value": 0, "Order": 1 }, { "Id": 3326, "Text": "keytremorfelt", "Value": 1, "Order": 2 }, { "Id": 3327, "Text": "keyslighttremor", "Value": 2, "Order": 3 }, { "Id": 3328, "Text": "keygrosstremor", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 231, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 10, "Text": "MOS10", "Options": [{ "Id": 3395, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3396, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3397, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3398, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3399, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 244, "QuestionnaireName": "SOWS", "Order": 10, "Text": "SOWS10", "Options": [{ "Id": 3476, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3477, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3478, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3479, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3480, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 202, "QuestionnaireName": "Training", "Order": 11, "Text": "Training11", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 218, "QuestionnaireName": "COWS", "Order": 11, "Text": "COWS11", "Options": [{ "Id": 3329, "Text": "keynoywaning", "Value": 0, "Order": 1 }, { "Id": 3330, "Text": "keyyawningonce", "Value": 1, "Order": 2 }, { "Id": 3331, "Text": "keyyawningthree", "Value": 2, "Order": 3 }, { "Id": 3332, "Text": "keyyawningseveral", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 232, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 11, "Text": "MOS11", "Options": [{ "Id": 3400, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3401, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3402, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3403, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3404, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 245, "QuestionnaireName": "SOWS", "Order": 11, "Text": "SOWS11", "Options": [{ "Id": 3481, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3482, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3483, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3484, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3485, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 203, "QuestionnaireName": "Training", "Order": 12, "Text": "Training12", "Options": [{ "Id": 642, "Text": "keycontact", "Value": 0, "Order": 1 }, { "Id": 643, "Text": "keyforgot", "Value": 1, "Order": 2 }], "InputFieldType": "Radiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 219, "QuestionnaireName": "COWS", "Order": 12, "Text": "COWS12", "Options": [{ "Id": 3333, "Text": "keynone", "Value": 0, "Order": 1 }, { "Id": 3334, "Text": "keyincreasingirritability", "Value": 1, "Order": 2 }, { "Id": 3335, "Text": "keyobviouslyirritable", "Value": 2, "Order": 3 }, { "Id": 3336, "Text": "keysoirritable", "Value": 4, "Order": 4 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 233, "QuestionnaireName": "MOS_Sleep_Scale", "Order": 12, "Text": "MOS12", "Options": [{ "Id": 3405, "Text": "keyalloftime", "Value": 1, "Order": 1 }, { "Id": 3406, "Text": "keymostoftime", "Value": 2, "Order": 2 }, { "Id": 3407, "Text": "keygoodbit", "Value": 3, "Order": 3 }, { "Id": 3408, "Text": "keysomeoftime", "Value": 4, "Order": 4 }, { "Id": 3409, "Text": "keylittleoftime", "Value": 5, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 246, "QuestionnaireName": "SOWS", "Order": 12, "Text": "SOWS12", "Options": [{ "Id": 3486, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3487, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3488, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3489, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3490, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 204, "QuestionnaireName": "Training", "Order": 13, "Text": "Training13", "Options": [{ "Id": 644, "Text": "keyready", "Value": 1, "Order": 1 }, { "Id": 3511, "Text": "keymoretraining", "Value": 0, "Order": 2 }], "InputFieldType": "Radiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 220, "QuestionnaireName": "COWS", "Order": 13, "Text": "COWS13", "Options": [{ "Id": 3337, "Text": "keysmooth", "Value": 0, "Order": 1 }, { "Id": 3338, "Text": "keypiloeretion", "Value": 3, "Order": 2 }, { "Id": 3339, "Text": "keyprominent", "Value": 5, "Order": 3 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 247, "QuestionnaireName": "SOWS", "Order": 13, "Text": "SOWS13", "Options": [{ "Id": 3491, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3492, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3493, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3494, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3495, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 205, "QuestionnaireName": "Training", "Order": 14, "Text": "Training14", "Options": [{ "Id": 646, "Text": "keyrepeat", "Value": 1, "Order": 1 }, { "Id": 3512, "Text": "keycontactprime", "Value": 2, "Order": 2 }], "InputFieldType": "Radiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 248, "QuestionnaireName": "SOWS", "Order": 14, "Text": "SOWS14", "Options": [{ "Id": 3496, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3497, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3498, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3499, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3500, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 206, "QuestionnaireName": "Training", "Order": 15, "Text": "Training15", "Options": [], "InputFieldType": "None", "IsActive": false, "IsRequired": false, "IsInstruction": false, "Group": null }, { "Id": 249, "QuestionnaireName": "SOWS", "Order": 15, "Text": "SOWS15", "Options": [{ "Id": 3501, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3502, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3503, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3504, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3505, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 250, "QuestionnaireName": "SOWS", "Order": 16, "Text": "SOWS16", "Options": [{ "Id": 3506, "Text": "keynotatall", "Value": 0, "Order": 1 }, { "Id": 3507, "Text": "keyalittle", "Value": 1, "Order": 2 }, { "Id": 3508, "Text": "keymoderately", "Value": 2, "Order": 3 }, { "Id": 3509, "Text": "keyquiteabit", "Value": 3, "Order": 4 }, { "Id": 3510, "Text": "keyextremely", "Value": 4, "Order": 5 }], "InputFieldType": "PlainRadiobutton", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }, { "Id": 251, "QuestionnaireName": "Training", "Order": 16, "Text": "TrainingComplete", "Options": [], "InputFieldType": "CustomScreen", "IsActive": false, "IsRequired": true, "IsInstruction": false, "Group": null }];

    return rows;
}


//debug
function loadQ() {
    questionController.questions = {};
    var obj = {};
    for (var i = 0; i < qDebug.length; i++) {
        var curr = qDebug[i];
        if (typeof (obj[curr.type]) == 'undefined') {
            obj[curr.type] = {};
        }
        if (typeof (obj[curr.type][curr.Order]) == 'undefined') {
            obj[curr.type][curr.Order] = [];
        }
        obj[curr.type][curr.sortorder].push(new Question(qDebug[i]));
    }
    questionController.questions = obj;
}

/*
ID	LocalizationTextID	Description	Order	InputFieldTypeID	ValidationExpression	ValidationErrorMessage	ItemList	MinValue	MaxValue	MinValueLocalizationTextID	MaxValueLocalizationTextID	QuestionType	Available	IsRequired	InstructionTextID	IsEditable	QuestionAnchor	AnchorAnswerId
59	OtherSymptomStopDateQuestion	Other Symptom - Stop Date	4	7	NULL	NULL	NULL	NULL	NULL	NULL	NULL	Symptom	1	1	NULL	0	58	82
60	OtherSymptomIntensityQuestion	Other Symptom - Intensity	5	3	NULL	NULL	7DayIntensityOptionOne:1,7DayIntensityOptionTwo:2,7DayIntensityOptionThree:3	NULL	NULL	NULL	NULL	Symptom	1	1	NULL	0	NULL	NULL
61	OtherSymptomMedAdviceQuestion	Other Symptom - Med Advice	6	3	NULL	NULL	7DayOptionOne:1,7DayOptionTwo:2	NULL	NULL	NULL	NULL	Symptom	1	1	NULL	0	NULL	NULL
*/


/*QUESTION LIST EXAMPLE

//PLEASE NOTE THIS IS NOW AN ARRAY OF QUESTIONS
{
    "OtherSymptom": {
        "4": [{
            "id": 56,
            "textid": "OtherSymptomStopDateQuestion",
            "type": "OtherSymptom",
            "sortorder": 4,
            "itemlist": "",
            "inputfieldtype": 7,
            "isrequired": "Y"
        ]},
        "5": {
            "id": 60,
            "textid": "OtherSymptomIntensityQuestion",
            "type": "OtherSymptom",
            "sortorder": 5,
            "itemlist": "7DayIntensityOptionOne:1,7DayIntensityOptionTwo:2,7DayIntensityOptionThree:3",
            "inputfieldtype": 3,
            "isrequired": "Y"
        },
        "6": {
            "id": 61,
            "textid": "OtherSymptomMedAdviceQuestion",
            "type": "OtherSymptom",
            "sortorder": 6,
            "itemlist": "7DayOptionOne:1,7DayOptionTwo:2,,7DayOptionThree:3,7DayOptionFour:4,7DayOptionFive:5",
            "inputfieldtype": 3,
            "isrequired": "Y"
        }
    },
    "DiffType": {
        "6": {
            "id": 61,
            "textid": "OtherSymptomMedAdviceQuestion2",
            "type": "DiffType",
            "sortorder": 6,
            "itemlist": "7DayOptionOne:1,7DayOptionTwo:2",
            "inputfieldtype": 3,
            "isrequired": "Y"
        }
    }
}

*/