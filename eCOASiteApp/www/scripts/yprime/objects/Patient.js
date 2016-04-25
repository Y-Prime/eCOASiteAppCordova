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

        function callback(tx, results) {
            if (serviceController.connected()) {
                //transmit the patient - step out of thread to force commit
                setTimeout(function () {
                    patientController.transmitPatientInformation(onSuccess, onError);
                }, 1);
            } else {
                if (typeof onSuccess == 'function') {
                    onSuccess(tx, results);
                }
            }
        };

        this.insertUpdate(this, callback, null);
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

            //debug
            //result = true;
            callback(result);
        }

        this.getDiaryHistory(checkDiaryHistory);
    };

    this.getNextDailyDiaryDate = function (callback) {
        function nextDiaryCallback(rows) {
            var nextDiaryDate = null;
            var hour = moment().get('hour');
            //account for early morning = yesterday
            nextDiaryDate = moment().add((hour <= diaryEndTime ? -1 : 0), 'd');        
            callback(nextDiaryDate);
        }

        this.getDiaryHistory(nextDiaryCallback);
    };

    this.getDiaryHistory = function (onSuccess, onError) {
        var sql = 'SELECT DISTINCT [Date] FROM Ediary WHERE PatientNumber=? AND QuestionnaireName=? ORDER BY [Date] DESC';
        var pars = [currentPatientObject.PatientNumber, 'Daily_Diary'];

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