/***********************
File: 			BaseObjectClass.js
Date: 			04Nov2015
Created: 		J Osifchin
Description: 	base class for all db objects
***************************/
function inheritBase(obj) {
    var base = new BaseObjectClass();
    $.extend(obj, base);
}

function BaseObjectClass() {
    this.mergeObject = function (obj) {
        $.extend(this, obj);
    };
    this.tableName = function () { return "notconfigured"; };
    this.insertUpdate = function (dto, onSuccess, onError) {
        var obj = (typeof dto != 'undefined' && dto != null) ? dto : this;
        dbController.insertUpdate(obj, this.tableName(), onSuccess, onError)
    };
    this.load = function (obj, onSuccess, onError) {
        //load the object
        if (typeof obj == "object") {
            this.mergeObject(obj);
            if (typeof onSuccess == 'function') {
                onSuccess();
            }
        } else {
            //assume the key is passed in
            this.get(obj, onSuccess, onError);
        }
    };
}