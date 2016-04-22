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
            'WPAI': {
                '2': {
                    Routes: [
                                {
                                    //assembla #294 - if patient doesn't work go to end of questionnaire
                                    QuestionId: 400,
                                    EnteredValue: 1,
                                    NavigateTo: 7
                                }

                    ]
                }
            },
            checkStatusNavigate: function (questionid) {
                //check the current patient status and return the correct page #
                var currentStatusId = patientController.getCurrentPatient().getCurrentStatus();
                var navigatePage = null;
                var statusRequiresBagList = [-1, 6, 8, 10, 13];
                var requiresBag = arrayContains(statusRequiresBagList, currentStatusId);

                switch (questionid) {
                    case 173:
                        //5 if status not in list
                        navigatePage = requiresBag ? 4 : 5;
                        break;
                    case 175:
                        navigatePage = requiresBag ? 6 : 7;
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
                    //push the callback to the sent data?
                    //screenController.setDataTransferSuccessCallback(questionnaireCallback);
                    //questionnaireCallback();
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
                PatientNumber: patientController.getCurrentPatient().PatientNumber,
                DeviceMacAddress: app.getMacAddress(),
                Date: diaryDate,
                VisitId: currentVisitNumber,
                QuestionnaireName: questionnaireName,
                Status: 'Saved',
                Source: 'SiteEPRO',
                Started: questionnaireStartTime,
                Completed: questionnaireCompletedTime,
                TransmitDate: null
            };

            sqlArray.push(dbController.getInsertUpdateSql(entryObject, 'EDiary'));
            parameterArray.push(dbController.getInsertUpdateParameters(entryObject));

            for (var p in answers) {
                var currentQuestion = null;
                var r = new RegExp(questionDelimiter);//p.match(/_/)
                var regExPeriod = /\./;
                if (p.match(r) && p.split(questionDelimiter)[0] == questionnaireName && !p.match(regExPeriod)) {
                    id = p.split(questionDelimiter)[2];
                    values = answers[p];

                    //loop because the answers are now in an array
                    for (var j = 0; j < values.length; j++) {
                        var value = values[j];

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

            //set the title for specific scale:
            var showTitleList = ['EQ_5D_5L'];
            if (arrayContains(showTitleList, questionnaireName)) {
                title = visitController.getCurrentQuestionnaire().EDiaryQuestionnaireName;
            }

            //check for custom screen
            var nextQuestionPage = this.getLoadedQuestionPage(questionnaireName, sortOrder);
            var nextQuestion = nextQuestionPage[0];
            var isLandscapeOrientation = false;
            //var screen = nextQuestion.EdiaryInputFieldType == 'CustomScreen' ? nextQuestion.Text : 'QuestionResponse';
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
            var page = this.getLoadedQuestionPage(questionnaireName, sortOrder);
            var result = true;
            var messageKey = 'keyAnswerRequired'; //keyIncorrectAnswer
            for (var i = 0; i < page.length; i++) {
                if (!page[i].valid()) {
                    result = false;
                    break;
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


