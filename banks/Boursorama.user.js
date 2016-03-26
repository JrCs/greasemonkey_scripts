// ==UserScript==
// @name          Boursorama - No Virtual Keyboard
// @namespace     org.jrcs
// @author        JrCs
// @copyright     2014-2016, https://github.com/JrCs/greasemonkey_scripts
// @description   Remove virtual keyboard and add a classic input text field for the password on Boursorama website.
// @include       https://clients.boursorama.com/connexion*
// @include       http://localhost:5789/boursorama/Boursorama%20Banque.html*
// @version       1.0
// @updateURL     https://github.com/JrCs/greasemonkey_scripts/raw/master/banks/Boursorama.user.js
// @require       http://code.jquery.com/jquery-1.11.1.min.js
// @require       https://raw.githubusercontent.com/SheetJS/js-crc32/master/crc32.js
// @grant         GM_addStyle
// ==/UserScript==
/*
 - The @grant directive is needed to work around a design change introduced in GM 1.0,
 It restores the sandbox. Don't use grant none

 - Script test under Greasemonkey, NinjaKit and Tampermonkey
 */

try {

    // Can't use GM_info with NinjaKit for safari
    var scriptName = 'Boursorama - No Virtual Keyboard'
    var version = '1.0';

    var debug = false;
    //var debug = true;

    var crcToNumber = new Object();

    crcToNumber["2A190808"] = -1
    crcToNumber["14C79344"] = 0
    crcToNumber["321A2A99"] = 1
    crcToNumber["70E5E999"] = 2
    crcToNumber["B6447353"] = 3
    crcToNumber["C89A4D3B"] = 4
    crcToNumber["5C8290F1"] = 5
    crcToNumber["F164402B"] = 6
    crcToNumber["371846FF"] = 7
    crcToNumber["F219A449"] = 8
    crcToNumber["DA6970E6"] = 9

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
        if (typeof(use) === 'undefined') // Query if we use the virtual keyboard or not
            return _simulateVirtualPad;

        _simulateVirtualPad = use // Force or not using virtual keyboard

        $('#gm_password').toggle(_simulateVirtualPad)
        $('#gm_cancel_button').toggle(_simulateVirtualPad)

        $('#form_fakePassword').toggle(!_simulateVirtualPad || debug) // Hide or not the original input password
        $('.login-window__actions-mask > hx\\:include').toggle(!_simulateVirtualPad || debug) // Hide or not the original virtual keyboard
        return use;
    };

    function decodeGrid($grid) {
        var nbCols = 4;
        var nbRows = 3;

        var canvas, ctx, imageData;

        number2GridPosition = new Object()
        $images = $( "li span.sasmap__key img", $grid )
        if ($images.size() === 0) {
            throw new Error("Aucune grille d'identification trouvée. Utilisez le pavé virtuel !");
        }

        var $body = $("body");

        for (y = 0; y < nbRows; y++) { // each row
            for (x = 0; x < nbCols; x++) { // each col
                var gridPosition = (y * nbCols) + x;

                img = $images.get(gridPosition)
                var canvas = $("<canvas/>")
                        .attr({ 'width': img.width, 'height': img.height })
                        .css({ 'display': 'inline', 'border': '1px solid red' })
                        .get(0); // Get the DOM element

                // Copy the image contents to the canvas
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                var imageData = ctx.getImageData(0, 0, img.width, img.height);
                var pixels    = convertColor(imageData, 128); // return a buffer of pixels encoded in 32bit
                var imageCRC  = dec32ToHex(CRC32.buf(pixels));
                var number    = crcToNumber[imageCRC];

                if (debug) {
                    ctx.putImageData(imageData, 0, 0) // Fill canvas with the thresholded image
                    var $numberElement =
                            $("<span>")
                            .css({ 'style': 'border-bottom: 1px solid red', 'font-family': '"Lucida Console", Monaco, monospace' })
                            .text(" row=" + y + "; col=" + x +
                                  "; gridPosition=" + gridPosition + "; crc=" + imageCRC + " = " + number)
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

        // Verify that all number are affected
        for (n = 0; n < 10; n++) {
            if (typeof number2GridPosition[n] === "undefined") {
                throw new Error("Grille non decodée pour le chiffre " + n + ". Utilisez le pavé virtuel !");
                break;
            }
        }
    }

    /**
     * Called when user click on the link to log in
     */
    function simulatePad() {
        $(".form-row__fake-password__cancel .icon-close2").first().click() // Remove old data

        if (padDecoded !== true) {
            var $grid = $("ul.password-input")
            try {
                // console.time('decodeGrid')
                decodeGrid($grid);
                // console.timeEnd('decodeGrid')
                padDecoded = true;
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
                return false;
            }
        }
        var $virtualKeyboard = $(".sasmap .sasmap__key") // array of keyboard key

        var password = $("#gm_password").val();
        for (s = 0; s < password.length; s++) {
            var grilleChar = number2GridPosition[password[s]];
            if (debug) {
                console.log(grilleChar);
            }
            $($virtualKeyboard[grilleChar]).click();
        }
        return true;
    }

    function addPasswordInput() {
        // Add an input without name so it will not be submit
        var $divControlPasswordInput =
                $('<input id="gm_password" type="password" class="form-row__fake-password"'+
                  'autocomplete="On" maxlength="12">')
                .on('change', function(event) {
                    if (simulateVirtualPad() === true)
                        simulatePad()
                })
        // Add another Cancel button (style take from original)
        var $cancelButton=
                $('<a id="gm_cancel_button" style="display: inline;" href="javascript://" class="form-row__fake-password__cancel"><span class="icon-close2"></span></a>')
          .on('click', function() {
              $divControlPasswordInput.val("").trigger("change") // Clear input password when Cancel button is click
          })

          var $fakepasswordContainer = $('div[data-name="fakePassword"] .form-row__widget')
          $fakepasswordContainer.append($divControlPasswordInput, $cancelButton)

        $('#form_fakePassword', $fakepasswordContainer).toggle(debug) // Display or not the original password input
    }

    function addScriptInfos() {
        // add some info about this script
        var $infos = $("<div>")
                .css({
                    'color': 'white',
                    'font-size': '11px',
                    'line-height': '14px',
                    'position': 'relative',
                    'right': '-30px',
                    'text-align': 'right',
                    'top': '12px'
                })
                .html(scriptName+'<br/>Version ' + version);
        $('.login-window').append($infos);
    }

    function customizeUi() {

        addPasswordInput();

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
        $('.login-window__actions-mask').prepend($gm_alert.hide()); // Add our own alert container

        simulateVirtualPad(true);

    }

    function main() {
        customizeUi();
    };

    main();
}
// end try

catch(e) {
    console.error(e.message);
    console.log(e.stack);
}
