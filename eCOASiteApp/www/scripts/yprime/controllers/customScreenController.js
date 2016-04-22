/***********************
File: 			customScreenController.js
Date: 			22Jan2016
Created: 		J Osifchin
Description: 	control to handle custom screen calls
***************************/
var customQuestionInputAttribute = 'question-custom-input';

var customScreenController = (function () {
    return {
        setQuestionValue: function (val) {
            //find the single control and set the value
            var obj = $('.' + customQuestionInputAttribute);
            $(obj).val(val);
            //set the value in the answers object
            $(obj).trigger("input.yprime");
        },
        getQuestionValue: function () {
            //find the single control and set the value
            var obj = $('.' + customQuestionInputAttribute);
            return $(obj).val();
        }
    };
})();
