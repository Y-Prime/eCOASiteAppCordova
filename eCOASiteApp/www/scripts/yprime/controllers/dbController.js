/***********************
File: 			dbController.js
Date: 			30Oct2015
Created: 		J Osifchin
Description: 	control to handle database calls
***************************/
var dbController = (function () {
    return {
        dbContext: {},
        init: function (name, version, description, size) {
            var db = window.openDatabase(name, version, description, size);
            this.dbContext = db;
            this.checkTables();
            app.writeLog('Initialized DB Controller...');
        },
        insertUpdate: function (obj, tableName, onSuccess, onError) {
            dbController.executeSql(this.getInsertUpdateSql(obj, tableName), this.getInsertUpdateParameters(obj), onSuccess, onError);
            //example sql command
            //'INSERT OR REPLACE INTO reminder (patientId, reminderName, reminderTypeId, reminderValue, reminderHour, reminderMinute, transmit) VALUES (?,?,?,?,?,?,?)'
        },
        getInsertUpdateSql: function (obj, tableName) {
            var sql = 'INSERT OR REPLACE INTO ' + tableName;
            var fields = '';
            var values = '';

            for (var p in obj) {
                if (typeof obj[p] != 'function') {
                    fields += (fields.length > 0 ? ',' : '') + '[' + p + ']';
                    values += (values.length > 0 ? ',' : '') + '?';
                }
            }
            sql = sql + ' (' + fields + ') VALUES (' + values + ')';

            return sql;
        },
        getInsertUpdateParameters: function (obj) {
            var pars = [];

            for (var p in obj) {
                if (typeof obj[p] != 'function') {
                    //pars.push(dbController.formatSQLValue(obj[p]));
                    pars.push(obj[p]);
                }
            }
            return pars;
        },
        executeSqlStatements: function (sqlArray, parameterArray, onSuccess, onError) {
            //make sure the statements run in order due to pop() -- don't do this!!!
            //sqlArray = sqlArray.reverse();
            //parameterArray = parameterArray.reverse();

            function fn() {
                if (sqlArray.length > 0) {
                    sql = sqlArray.pop();
                    par = parameterArray.pop();

                    dbController.executeSql(sql, par, fn(sqlArray, parameterArray, onSuccess, onError));
                } else {
                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                }
            }

            fn(sqlArray, parameterArray, onSuccess, onError);
        },
        executeSql: function (sql, pars, onSuccess, onError) {
            //app.writeLog(sql);
            //app.writeLog(pars);
            dbController.dbContext.transaction(function (tx) {
                tx.executeSql(
                    sql,
                    pars,
                    function (tx, results) {
                        if (typeof onSuccess == "function") {
                            onSuccess(tx, dbController.formatData(results));
                        }
                    },
                    function (tx, error) {
                        if (typeof onError == "function") {
                            onError(tx, error);
                        }
                        dbController.dbErrorCallback(error);
                    }
                );
            }),
            dbController.dbErrorCallback
        },
        formatData: function (results) {
            //format the data to a consistent format
            var formattedResults = [];
            var len = results.rows.length;
            if (len > 0) {
                for (var i = 0; i < len; i++) {
                    formattedResults.push(results.rows.item(i));
                }
            }
            return formattedResults;
        },
        formatSQLValue: function (val) {
            return (val + '').replace("'", "''");
        },
        checkTables: function () {
            var tableCheckList = [
                'CREATE TABLE IF NOT EXISTS users (UserName PRIMARY KEY, Password, PatientList)',
                'CREATE TABLE IF NOT EXISTS Patient (PatientNumber PRIMARY KEY,EnrolledId, Id, Pin, IsTempPin, PatientStatusTypeId, PatientGender, SecurityAnswer, LoginAttempts INT, EnrolledDate, IsTrainingComplete, PhoneNumber, SiteId, NextVisit, BLDate, Transmitted)',
                'CREATE TABLE IF NOT EXISTS ReminderType (Id INT PRIMARY KEY NOT NULL, Value TEXT )',
                'CREATE TABLE IF NOT EXISTS Reminder (PatientNumber TEXT, ReminderName TEXT,  ReminderTypeId INT, ReminderValue TEXT, ReminderHour INT, ReminderMinute INT, Transmitted TEXT, PRIMARY KEY (PatientNumber, ReminderName))',
                'CREATE TABLE IF NOT EXISTS Translation ([TranslationKey] PRIMARY KEY, [TranslationText], [CultureCode])',
                'CREATE TABLE IF NOT EXISTS EDiaryQuestion ([Id] PRIMARY KEY, [EdiaryQuestionnaire], [EdiaryInputFieldType], [Text], [InputDisplayText], [Order], [MinValue], [MinValueText], [MaxValue], [MaxValueText], [IsActive], [IsRequired], [IsInstruction], [Group], [IsLandscapeOrientation])',
                'CREATE TABLE IF NOT EXISTS EDiaryOption ([Id] PRIMARY KEY, [EdiaryQuestionId], [Text], [Value], [Order])',
                'CREATE TABLE IF NOT EXISTS EDiary ([Guid] PRIMARY KEY, [PatientNumber], [DeviceMacAddress], [Date], [VisitId], [QuestionnaireName], [Status], [Source], [Started], [Completed], [TransmitDate])',
                'CREATE TABLE IF NOT EXISTS EDiaryDetail ([Guid] PRIMARY KEY, [EdiaryGuid], [EdiaryQuestionId], [Value], [FreeTextAnswer])',
                'CREATE TABLE IF NOT EXISTS Visit ([VisitId]  PRIMARY KEY, [Name], [DisplayName], [TranslationKey], [Order])',
                'CREATE TABLE IF NOT EXISTS VisitEDiaryQuestionnaire ([VisitId], [VisitName], [EDiaryQuestionnaireName], [EDiaryQuestionnaireDisplayName], [Order], [EDiaryQuestionnaireTypeCode], PRIMARY KEY ([VisitId],[EDiaryQuestionnaireName]))',
                //'CREATE TABLE IF NOT EXISTS PatientVisit ([PatientId], [VisitNumber], [VisitDate], PRIMARY KEY ([PatientId], [VisitNumber]))',
                //'CREATE TABLE IF NOT EXISTS users (UserName unique, Password, PatientList)',
            ];

            //Id	EdiaryQuestionId	Text	Value	Order

            for (var i = 0; i < tableCheckList.length; i++) {
                this.executeSql(tableCheckList[i]);
            }
        },
        tableList: function () {
            var result = [
                'users',
                'Patient',
                'ReminderType',
                'Reminder',
                'Translation',
                'EDiaryQuestion',
                'EDiaryOption',
                'EDiary',
                'EDiaryDetail',
                'Visit',
                'VisitEDiaryQuestionnaire'//,
                //'PatientVisit'
            ];
            return result;
        },
        resetDB: function () {
            var tables = this.tableList();

            function callback() {
                if (tables.length > 0) {
                    dbController.dropTable(tables.pop(), callback);
                } else {
                    dbController.init();
                }
            };

            this.dropTable(tables.pop(), callback);
        },
        showTable: function (tablename, resultObj) {
            this.executeSql(
                'SELECT * FROM ' + tablename,
                [],
                function (tx, results) {
                    var dataDisplay = dbController.formatDataDisplay(tablename, results, typeof resultObj != 'undefined');
                    if (typeof resultObj == 'undefined') {
                        app.alert(dataDisplay);
                    } else {
                        $(resultObj).html(dataDisplay.replace('\n', '</br>'));
                    }
                },
                null);
        },
        formatDataDisplay: function (tablename, rows, html) {
            var crlf = html ? '</br>' : '\n';
            var result = '********************************' + crlf;
            var result = tablename + crlf;
            for (var i = 0; i < rows.length; i++) {
                result += '-------------------------------' + crlf;
                var row = rows[i];
                for (var p in row) {
                    result += p + ' = ' + row[p] + crlf;
                }
            }

            return result;
        },
        dropTable: function (tablename, callback) {
            app.writeLog('DROPPING TABLE: ' + tablename);
            this.executeSql('DROP TABLE ' + tablename, [], callback, null);
        },
        getGuid: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }

            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        },

        dbErrorCallback: function (error) {
            var message = "SQLite Error: ERROR CODE " + error.code + ': ' + error.message;
            alert(message);
            //var title = "SQLite Error";
            app.writeLog(message, true);
        }
    };
})();




