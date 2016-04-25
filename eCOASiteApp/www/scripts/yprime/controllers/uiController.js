/***********************
File: 			uiController.js
Date: 			10Nov2015
Created: 		J Osifchin
Description: 	control to handle UI html object creation
***************************/
var uiController = (function () {
    return {
        createControl: function (type, options) {
            var ctrl = document.createElement(type);
            for (var p in options) {
                ctrl.setAttribute(p, options[p]);
            }
            return ctrl;
        },
        createInputControl: function (id, options) {
            var input = this.createControl('input', options);// document.createElement('input');
            input.setAttribute('id', id);

            for (var p in options) {
                input.setAttribute(p, options[p]);
            }

            return input;
        },
        encodeHTML: function (str) {
            var html = str.replace('\n', '<br/>');
            return html;
        },
        limitInputCharacters: function (obj, len) {
            var val = obj.value + '';
            if (typeof val != 'undefined' && (val.length >= len)) {
                obj.value = val.substring(0, len);
            }
        },
        validEmailAddress: function (emailAddress) {
            var regEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return regEx.test(emailAddress);
        }
    };
})();


/*


*/