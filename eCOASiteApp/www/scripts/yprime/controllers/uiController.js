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
        createTableControl: function (rows, cols) {
            var tbl = this.createControl("table");

            var colCount = 0;
            for (var rowCount = 0; rowCount < rows; rowCount++) {
                var newRow = this.createControl("tr");
                for (colCount = 0; colCount < cols; colCount++) {
                    var newCell = this.createControl("td", { "rowIndex": rowCount, "colIndex": colCount });
                    //$(newCell).text("Row: " + rowCount + "Col: " + colCount);
                    newRow.appendChild(newCell);
                }
                tbl.appendChild(newRow);
            }
            return (tbl);
        },
        encodeHTML: function (str) {
            var html = str.replace('\n','<br/>');
            return html;
        }
    };
})();


/*


*/