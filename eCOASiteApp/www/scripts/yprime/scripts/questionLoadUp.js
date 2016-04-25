/***********************
File: 			questionLoadUp.js
Date: 			07Jan2016
Created: 		J Osifchin
Description: 	generic scripts for question pages
***************************/
function loadQuestionPage() {
    var pars = screenController.getScreenParameters();
    var questionPage = questionController.getLoadedQuestionPage(pars.typename, pars.sortorder);
    var question = questionPage[0]; //TODO: this might be problematic

    $('#' + contentDivName).find('.inner-content').append(questionController.renderQuestionPageHTML(questionPage));
    setUpNavigationButtons(question);
}

function setUpNavigationButtons(question) {
    var previousId = question.getPreviousQuestionId();
    //var nextId = question.getNextQuestionId();
    var backBtn = $('#QuestionBackButton');
    var nextBtn = $('#QuestionNextButton');
    var exitBtn = $('#QuestionExitButton');

    if (previousId != null) {
        $(backBtn).show();
        $(backBtn).bind('click', function () {

            var previousId = question.getPreviousQuestionId();
            goToQuestion(question.EdiaryQuestionnaire, previousId, true);
        });
    } else {
        $(backBtn).hide();
    }


    $(nextBtn).show();

    function fnNext() {
        var pars = screenController.getScreenParameters();
        if (questionController.validQuestionPage(pars.typename, pars.sortorder)) {
            var nextId = question.getNextQuestionId();
            //check here in case the route ENDS the questionnaire
            if (nextId == null) {
                //send to the electronic signature
                screenController.changeScreen('ElectronicSignature', 'keyElectronicSignature', null, null, null, pars);
            } else {
                goToQuestion(question.EdiaryQuestionnaire, nextId);
            }
        }
    };

    $(nextBtn).bind('click', fnNext);

    $(exitBtn).bind('click', function () {
        var fn = function (idx) {
            if (idx == 1) {
                screenController.clearInputDefaults();
                screenController.goToPreviousScreen(true);
            }
        };
        questionController.confirmExit(fn);
    });

}


function goToQuestion(questionnaireName, sortOrder, isBackButton) {
    questionController.goToQuestion(questionnaireName, sortOrder, isBackButton);
}
