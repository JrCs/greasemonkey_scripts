﻿// ==UserScript==
// @name          Boursorama - No Virtual Keyboard
// @namespace     org.jrcs
// @author        JrCs
// @copyright     2014, https://github.com/JrCs/greasemonkey_scripts
// @description   Remove virtual keyboard and add a classic input text field for the password on Boursorama website.
// @include       https://www.boursorama.com/connexion.phtml*
// @include       http://localhost:63342/userscripts/tests/boursorama/Connexion.html
// @version       0.2
// @updateURL     https://github.com/JrCs/greasemonkey_scripts/raw/master/banks/Boursorama.user.js
// @require       http://code.jquery.com/jquery-1.11.1.min.js
// @require       https://raw.githubusercontent.com/SheetJS/js-crc32/master/crc32.js
// @grant       GM_addStyle
// ==/UserScript==
/*
  - The @grant directive is needed to work around a design change introduced in GM 1.0,
    It restores the sandbox. Don't use grant none

  - Script test under Greasemonkey, NinjaKit and Tampermonkey
*/

try {

// Can't use GM_info with NinjaKit for safari
var scriptName = 'Boursorama - No Virtual Keyboard'
var version = '0.2';

var debug = false;
//var debug = true;

var crcToNumber = new Object();

crcToNumber["944E76AF"] = -1
crcToNumber["540D2DAB"] = 0
crcToNumber["2E08B635"] = 1
crcToNumber["25097043"] = 2
crcToNumber["216ED1C2"] = 3
crcToNumber["4AC758FB"] = 4
crcToNumber["9D0166E0"] = 5
crcToNumber["F318276D"] = 6
crcToNumber["04ED95E4"] = 7
crcToNumber["EF489937"] = 8
crcToNumber["53DB0FF3"] = 9
    
var number2GridPosition;
var padDecoded = false;
var _simulateVirtualPad = true;

/**
 * Convert a 32bit number to a hex string
 */
function dec32ToHex(number) {
    if (number < 0) number = 0x100000000 + number;
    var hexStr = number.toString(16).toUpperCase();
    return Array(Math.max(8 - String(hexStr).length + 1, 0)).join(0) + hexStr
}

/**
 * Convert a canvas imagedata to black and white
 * First argument is the imagedata object
 * Second argument is the threshold
 * Return the imagedata data (pixels encoded in 32bit)
 */
function convertColor(image_data, threshold) {
    var pix = image_data.data;
    for (var i = 0, n = pix.length; i < n; i += 4) {
        var luma  = Math.floor(pix[i] * .299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114);
        var color = luma >= threshold ? 255 : 0;
        pix[i]     = color; // red
        pix[i + 1] = color; // green
        pix[i + 2] = color; // blue
        pix[i + 3] = 255;   // alpha
    }
    return pix;
};

function simulateVirtualPad(use) {
    if (typeof(use) === 'undefined')
        return _simulateVirtualPad;

    _simulateVirtualPad = use

    $('#gm_password').toggle(_simulateVirtualPad)
    $('#gm_submit_buttons').toggle(_simulateVirtualPad)

    $('div#login-pad').toggle(!_simulateVirtualPad || debug)
    $('.lvl-notice').toggle(!_simulateVirtualPad);
};

function decodeGrid(pad) {
    var canvas, ctx, imageData;

    number2GridPosition = new Object();

    var nbCols = 3;
    var nbRows = 4;
    var numberPartWidth = 100; // image of one number width
    var numberPartHeight = 60; // image of one number height

    var $body = $("body");

    for (y = 0; y < nbRows; y++) { // each row
        for (x = 0; x < nbCols; x++) { // each col
            var gridPosition = (y * nbCols) + x;
    
            var canvas = $("<canvas/>")
                .attr({ 'width': numberPartWidth, 'height': numberPartHeight })
                .css({ 'display': 'inline', 'border': '1px solid red' })
                .get(0); // Get the DOM element

            ctx = canvas.getContext('2d');

            ctx.drawImage(pad, x * numberPartWidth, y * numberPartHeight, numberPartWidth, numberPartHeight, 0, 0, numberPartWidth, numberPartHeight);
            var imageData = ctx.getImageData(0, 0, numberPartWidth, numberPartHeight);
            var pixels = convertColor(imageData, 240); // return a buffer of pixels encoded in 32bit
            var imageCRC = dec32ToHex(CRC32.buf(pixels));
            var number = crcToNumber[imageCRC];
            
            if (debug) {
                ctx.putImageData(imageData, 0, 0);
                var $numberElement =
                    $("<span>")
                    .css({ 'style': 'border-bottom: 1px solid red', 'font-family': '"Lucida Console", Monaco, monospace' })
                    .text(" row=" + y + "; col=" + x +
                          "; gridPosition=" + gridPosition + "; crc=" + imageCRC + " = " + number);
                $body.append(canvas, $numberElement, '<br/>')
            }
    
            if (number < -1 || number > 9) {
                throw new Error("Décodage de la grille échoué " + number);
            }

            if (number != -1) {
                number2GridPosition[number] = gridPosition;
            }
        }
    }
    
    for (n = 0; n < 10; n++) {
        if (typeof number2GridPosition[n] == "undefined") {
            throw new Error("Grille non decodée pour le chiffre " + n + ". Utilisez le pavé virtuel !");
            break;
        }
    }

    return number2GridPosition;
};

/**
 * Called when user click on the link to log in
 */
function simulatePad() {
    $("#login-pad #btn-cancel").click(); // Clear old datas
    var area = $("map area");

    var password = $("#gm_password").val();
    for (s = 0; s < password.length; s++) {
        var grilleChar = number2GridPosition[password[s]];
        if (debug) {
            console.log(grilleChar);
        }
        $(area[grilleChar]).click();
    }
    return true;
}

function addPasswordInput() {
    // Add an input without name so it will not be submit
    var $divControlPasswordInput = $('<div><input id="gm_password" type="password"'+
                                     'autocomplete="On" maxlength="12" placeholder="mot de passe"></div>')
    $("label#login-password-label").after($divControlPasswordInput);
}

function addSubmitButton() {
    var $form = $( "#identification_client" ).removeAttr('onsubmit'); // Remove old onsubmit

    // add a submit "button"
    var $divControlButtonInput = $("<div id='gm_submit_buttons'>")

    var $resetInputButton = $('<a class="btn">Annuler</button>').css('margin','10px 3px')
    $resetInputButton.appendTo($divControlButtonInput);
     // bind events
    $resetInputButton.on("click", function () {
        $("#gm_password").val('').trigger('change');
    });

    if (debug) {
        var $debugInputButton = $('<a class="btn btn-facebook">Debug</button>').css('margin','10px 3px')
        $debugInputButton.appendTo($divControlButtonInput);
        // bind events
        $debugInputButton.on("click", function () {
            $form.trigger('submit', false) // not a real submit
        });
    }

    var $loginInputButton = $('<a class="btn btn-purple" type="submit">Valider</button>').css('margin','10px 3px')
    $loginInputButton.appendTo($divControlButtonInput);
    // bind events
    $loginInputButton.on("click", function () {
        $('#login-pad #btn-submit').click();
    });

    $('#login-pad').after($divControlButtonInput);

    $form.on('submit', function( event, realSubmit ) {
        $('#gm_alert').hide(); // hide alert if one exist

        realSubmit = realSubmit === false ? false : true;

        if (simulateVirtualPad() === true) {
            if (padDecoded !== true) {
                var $grid = $("#login-pad img");
                var gridImgSrc = $grid.attr("src");
                $('<img/>', { 'src': gridImgSrc }).load(function () {
                    $(this).remove(); // prevent memory leaks
                    try {
                        // console.time('decodeGrid')
                        decodeGrid($grid.get(0));
                        // console.timeEnd('decodeGrid')
                        padDecoded = true;
                        $form.trigger('submit', realSubmit);
                    }
                    catch(e) {
                        if (e.name === "Error") {
                            $('#gm_alert').text(e).show();
                            // Restore the the virtual pad
                            simulateVirtualPad(false);
                        }
                        else {
                            throw(e)
                        }
                    }
                });
                return false;
            }
            else {
                simulatePad()
            }
        }

        // unsafeWindow is not supported by NinjaKit
        var check =
            typeof(unsafeWindow.checkForm) === 'function' ? unsafeWindow.checkForm($form.get(0)) : true;
        return realSubmit ? check : false
    });
}

function addScriptInfos() {
    // add some info about this script
    var $infos = $("<div>")
        .css({ 'float': 'right','position': 'relative',
               'top': '-4px', 'text-align': 'right',
               'color': '#6C6C6C'})
        .html(scriptName+'<br/>Version ' + version);
    $('#sas-login span.title').after($infos);
}

function customizeUi() {
    $("#login","#form-client").attr('placeholder','identifiant');

    addPasswordInput();

    addSubmitButton();

    addScriptInfos();

    var $gm_alert = $('<div id="gm_alert">')
        .css({
            "background-color": "#FFF5C6",
            "color": "red",
            "font-weight": "bolder",
            "font-size": "larger",
            "padding": "10px",
            "border-radius": "6px"
        });
    $('#sas-login div.bd').prepend($gm_alert.hide());

    if (debug) {
        $('div.footer').hide();
        $('img.promo').hide();
        $('#login-pad_pass').attr('type','text');
        $('#login-pad_passfake').hide();
    }

    simulateVirtualPad(true);

    $('#form-membre').hide();
    $('#form-client').show();
}

function main() {
    var $grid = $("#login-pad img");
    
    if (!$grid || ($grid.length == 0)) {
        alert("Aucune grille d'identification trouvee")
        return;
    }

    customizeUi();

};

main();

} // end try

catch(e) {
    console.error(e.message);
    console.log(e.stack);
}
