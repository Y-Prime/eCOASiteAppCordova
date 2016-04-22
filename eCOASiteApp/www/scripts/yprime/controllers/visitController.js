/***********************
File: 			visitController.js
Date: 			13Jan2016
Created: 		J Osifchin
Description: 	control for visits
***************************/
var currentVisit;

var visitController = (function () {
    return {
        init: function (success, fail) {
            //var sql = 'Select distinct [VisitId], [VisitName], [Order] from VisitEDiaryQuestionnaire order by [Order]'
        },
        getCurrentVisit: function() {
            if (typeof currentVisit == 'undefined') {
                currentVisit = null;
            }
            return currentVisit;
        },
        setCurrentVisit: function (obj) {
            currentVisit = obj;
        },
        getCurrentQuestionnaire: function () {
            if (typeof currentQuestionnaire == 'undefined') {
                currentQuestionnaire = null;
            }
            return currentQuestionnaire;
        },
        setCurrentQuestionnaire: function (obj) {
            currentQuestionnaire = obj;
        },
        inloadVisitPattern: function (visitpatterns, onSuccess, onFail) {
            var sqlCommands = [];
            var pars = [];
            var visitIds = [];

            // 'CREATE TABLE IF NOT EXISTS Visit ([VisitId] unique, [VisitName], [TranslationKey], [Order])',
            //VisitEDiaryQuestionnaire ([VisitId], [VisitName], [EDiaryQuestionnaireName], [Order], [EDiaryQuestionnaireTypeCode]
            function createVisitEdiaryQuestionnaireObject(e) {
                return {
                    VisitId: e.VisitId,
                    VisitName: e.VisitName,
                    EDiaryQuestionnaireName: e.EDiaryQuestionnaireName,
                    EDiaryQuestionnaireDisplayName: e.EDiaryQuestionnaireDisplayName,
                    Order: e.Order,
                    EDiaryQuestionnaireTypeCode: e.EDiaryQuestionnaireTypeCode
                };
            }

            function createVisitObject(e) {
                return {
                    VisitId: e.VisitId,
                    Name: e.VisitName,
                    DisplayName: e.VisitDisplayName,
                    Order: e.VisitOrder
                };
            }

            for (var i = 0; i < visitpatterns.length; i++) {
                if (!arrayContains(visitIds, visitpatterns[i].VisitId)) {
                    var visitObject = createVisitObject(visitpatterns[i]);
                    sqlCommands.push(dbController.getInsertUpdateSql(visitObject, 'Visit'));
                    pars.push(dbController.getInsertUpdateParameters(visitObject));
                    visitIds.push(visitpatterns[i].VisitId);
                }
                //check each patient to db
                var visitQuestionnaireObject = createVisitEdiaryQuestionnaireObject(visitpatterns[i]);
                sqlCommands.push(dbController.getInsertUpdateSql(visitQuestionnaireObject, 'VisitEDiaryQuestionnaire'));
                pars.push(dbController.getInsertUpdateParameters(visitQuestionnaireObject));
            }

            dbController.executeSqlStatements(sqlCommands, pars, onSuccess, onFail);
        }
    }
})();

