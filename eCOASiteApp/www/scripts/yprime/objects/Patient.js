/***********************
File: 			Patient.js
Date: 			04Nov2015
Created: 		J Osifchin
Description: 	Patient Object
                Inherits from Base Object
***************************/
function Patient(obj, onSuccess, onError) {
    //initialize the object
    inheritBase(this);
    this.tableName = function () { return "Patient"; };

    this.PatientNumber;
    this.EnrolledId;
    this.Pin;
    this.IsTempPin;
    this.PatientStatusTypeId;
    this.PatientGender;
    this.SecurityAnswer;
    this.LoginAttempts;
    this.EnrolledDate;
    this.IsTrainingComplete;
    this.PhoneNumber;
    this.SiteId;
    this.NextVisit;
    this.BLDate;
    this.Transmitted;

    //this.Reminders = []; Todo: add childrent to the object model

    this.get = function (patientId, onSuccess, onError) {
        var sql = 'SELECT * FROM Patient WHERE PatientNumber=?';
        var pars = [patientId];
        var handler = this;

        function callback(tx, results) {
            if (results.length == 1) {
                handler.mergeObject(results[0]);
                if (typeof onSuccess == 'function') {
                    onSuccess(tx, results);
                }
            }
        };
        dbController.executeSql(sql, pars, callback, onError);
    };

    this.getCurrentStatus = function () {
        return this.PatientStatusTypeId;
    };

    this.updatePIN = function (newPIN, onSuccess, onError) {
        this.Pin = patientController.encryptMD5(newPIN).toUpperCase();
        this.IsTempPin = false;
        this.Transmitted = false;

        function pinChangedSuccess(tx, results) {
            //reset the auth header
            if (serviceController.connected()) {
                serviceController.setAuthHeader(patientController.getCurrentPatient().PatientNumber, newPIN, false);
            }
            if (typeof onSuccess == 'function') {
                onSuccess(tx, results);
            }
        }

        function callback(tx, results) {
            if (serviceController.connected()) {
                //transmit the patient - step out of thread to force commit
                setTimeout(function () {
                    patientController.transmitPatientInformation(pinChangedSuccess, onError);
                }, 1);
            } else {
                pinChangedSuccess(tx, results);
            }
        };

        this.insertUpdate(this, callback, null);
    };

    this.isEnrolled = function () {
        return this.SecurityAnswer != null && this.SecurityAnswer != 'null';
    };

    this.enroll = function (securityQuestionId, answerValue, onSuccess, onError) {
        this.SecurityAnswer = patientController.encryptMD5(answerValue);
        this.Transmitted = false;

        function enrollmentSuccess(tx, results) {
            if (typeof onSuccess == 'function') {
                onSuccess(tx, results);
            }
        }

        function onEnroll(tx, results) {
            if (serviceController.connected()) {
                //transmit the patient - step out of thread to force commit
                setTimeout(function () {
                    patientController.transmitPatientInformation(onSuccess, onError);
                }, 1);
            } else {
                enrollmentSuccess(tx, results);
            }
        };

        this.insertUpdate(this, onEnroll, null);
    };

    /* this.updateAPI = function () {
         //TODO: send the patient information up to the API
     };
     */
    this.incrementLoginAttempts = function () {
        this.LoginAttempts++;
        this.insertUpdate(this);
    };

    this.resetLoginAttempts = function () {
        this.LoginAttempts = 0;
        this.insertUpdate(this);
    };

    this.getDiaryCanBeTaken = function (callback) {
        function checkDiaryHistory(dates) {
            var result = false;
            var currentDate = moment();
            var hour = moment().get('hour');
            var dateArray = [];

            //get the correct date to compare
            //check if patient is in the hour window
            if (hour <= diaryEndTime || hour >= diaryStartTime) {
                //if the hour is morning, go back one day
                if (hour <= diaryEndTime) {
                    currentDate = moment().add(-1, 'd');
                }


                for (var i = 0; i < dates.length; i++) {
                    dateArray.push(moment(dates[i].Date).format(compareDateFormat));
                }

                //check if the date has already been recorded
                result = !arrayContains(dateArray, currentDate.format(compareDateFormat));
            }
            callback(result);
        }

        this.getDiaryHistory(checkDiaryHistory);
    };

    this.getNextDailyDiaryDate = function (callback) {
        function nextDiaryCallback(rows) {
            var nextDiaryDate = null;
            var hour = moment().get('hour');

            if (rows.length > 0) {
                var temp = moment(rows[0]['Date'])
                if (temp.isValid()) {
                    nextDiaryDate = moment(temp).add((hour <= diaryEndTime ? 0 : 1), 'd');
                    if (nextDiaryDate.format(compareDateFormat) < moment().format(compareDateFormat)) {
                        nextDiaryDate = moment();
                    }
                } else {
                    nextDiaryDate = moment().add((hour <= diaryEndTime ? -1 : 0), 'd');
                }
            } else {
                //account for early morning = yesterday
                nextDiaryDate = moment().add((hour <= diaryEndTime ? -1 : 0), 'd');
            }
            callback(nextDiaryDate);
        }

        this.getDiaryHistory(nextDiaryCallback);
    };

    this.getDiaryHistory = function (onSuccess, onError) {
        var sql = 'SELECT DISTINCT [Date] FROM Ediary WHERE PatientNumber=? AND QuestionnaireName=? ORDER BY [Date] DESC';
        var pars = [patientController.getCurrentPatient().PatientNumber, 'Daily_Diary'];

        function clearDuplicates(rows) {
            var nonDupRows = [];
            var dates = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var dateVal = moment(row['Date']).format(displayDateFormat);
                if (!arrayContains(dates, dateVal)) {
                    nonDupRows.push(row);
                    dates.push(dateVal);
                }
            }

            return nonDupRows;
        };

        dbController.executeSql(sql, pars, function (tx, rows) { onSuccess(clearDuplicates(rows)); })
    };

    this.completeTraining = function (callback) {
        //check if training is completed
        if (this.IsTrainingComplete == true || this.IsTrainingComplete == 'true') {
            //go to the completed training screen
            screenController.changeScreen('TrainingComplete', '');
            if (typeof callback == 'function') {
                callback();
            }
        } else {
            //if no, complete it
            this.IsTrainingComplete = true;
            this.Transmitted = false;

            function callbackWrapper() {
                //go to the completed training screen
                screenController.changeScreen('TrainingComplete', '');
                if (typeof callback == 'function') {
                    callback();
                }
            }

            function callbackTransmit() {
                //transmit the data
                if (serviceController.connected()) {
                    screenController.setDataTransferSuccessCallback(callbackWrapper);
                    patientController.transmitPatientInformation();//callbackWrapper);
                } else {
                    callbackWrapper();
                }
            }
            this.insertUpdate(null, callbackTransmit);
        }

    };

    this.getVisits = function (onSuccess, onError) {
        var sql = 'select v.[VisitId], v.[Name], v.[DisplayName], v.[TranslationKey], v.[Order], (Select count(*) from EDiary where VisitId=v.VisitId and PatientNumber=?) as cnt,(Select count(*) from VisitEdiaryQuestionnaire where VisitId=v.VisitId) as qcnt  from Visit v order by v.[Order]'
        var patientNumber = patientController.getCurrentPatient().PatientNumber;
        var pars = [patientNumber];

        dbController.executeSql(sql, pars, onSuccess, onError);
    };

    this.getVisitQuestionnaires = function (visitId, onSuccess, onError) {
        var currentPatient = patientController.getCurrentPatient();
        var sql = 'select v.[VisitId],v.[VisitName],v.[EDiaryQuestionnaireName],v.[EDiaryQuestionnaireDisplayName], v.[EDiaryQuestionnaireTypeCode], v.[Order], (Select count(*) from EDiary where VisitId=v.VisitId and QuestionnaireName=v.EDiaryQuestionnaireName and PatientNumber=?) as cnt from VisitEDiaryQuestionnaire v where v.[VisitId]=?';
        //NOTE: this is specific to OPC!!!! DO NOT ADD TO BASE jo 02Feb2016
        if (currentPatient.PatientGender == 'F') {
            sql = "select v.[VisitId],v.[VisitName],v.[EDiaryQuestionnaireName],v.[EDiaryQuestionnaireDisplayName], v.[EDiaryQuestionnaireTypeCode], v.[Order], (Select count(*) from EDiary where VisitId=v.VisitId and (QuestionnaireName=v.EDiaryQuestionnaireName or (v.EDiaryQuestionnaireName='IIEF' and QuestionnaireName='EFSF_F') ) and PatientNumber=?) as cnt from VisitEDiaryQuestionnaire v where v.[VisitId]=?";
        }
        var patientNumber = currentPatient.PatientNumber;
        var pars = [patientNumber, visitId];

        function cleanUpVisitSchedule(tx, rows) {
            //OPC Specific
            var updatedRows = []

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                if (rows[i]['EDiaryQuestionnaireName'] == 'IIEF' && patientController.getCurrentPatient().PatientGender == 'F') {
                    //need to do this for phonegap build on BLU DO NOT REMOVE - jo 25Jan2016
                    row = {};
                    for (var par in rows[i]) {
                        row[par] = rows[i][par];
                    }
                    row.EDiaryQuestionnaireName = 'EFSF_F';
                    //assembla #295 - display FSFI correctly jo 02Feb2016
                    row.EDiaryQuestionnaireDisplayName = translationController.get('keyFSFI');

                    updatedRows.push(row);
                } else {
                    updatedRows.push(rows[i]);
                }
            }

            if (typeof onSuccess == 'function') {
                onSuccess(tx, updatedRows);
            }
        }

        dbController.executeSql(sql, pars, cleanUpVisitSchedule, onError);
    };

    this.load(obj, onSuccess, onError);
}

/********************
NOTE: the id column is ROWID
---------------------
CREATE TABLE patients (
    Patient unique
    , PIN
    , TempPIN
    , PhoneNumber
    , SiteId
    , NextVisit
    , BLDate
    , Changed
)

CREATE TABLE users (
    UserName unique
    , Password
    , PatientList
)


**********************/