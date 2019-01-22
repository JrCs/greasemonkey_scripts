// ==UserScript==
// @name          Webmail ACOSS - No Virtual Keyboard
// @namespace     org.jrcs
// @author        JrCs
// @copyright     2018, https://github.com/JrCs/greasemonkey_scripts
// @description   Remove virtual keyboard and add a classic input text field for the password on Webmail ACOSS website.
// @include       https://webmail2.urssaf.fr/mail
// @include       https://webmail2.urssaf.fr/names.nsf?Login
// @version       1.0
// @updateURL     https://raw.githubusercontent.com/JrCs/greasemonkey_scripts/master/others/WebmailACOSS.user.js
// @require       http://code.jquery.com/jquery-1.11.1.min.js
// @grant         GM_addStyle
// ==/UserScript==
/*
 - The @grant directive is needed to work around a design change introduced in GM 1.0,
 It restores the sandbox. Don't use grant none

 - Script test under Greasemonkey, NinjaKit and Tampermonkey
 */

try {
    function customizeUi() {
		$('input[name="dspPassword"]').hide() // Hide old password input
		$('input[name="Password"]')
			.addClass('lotusText')
			.attr('type', 'password')
			.css({ 'background-color':'#E6E6E6', 'font-family': '"Lucida Console", Monaco, monospace' })
			.show() // Show the new password input
		$('#keyboard_layout').hide() // Hide virtual Keyboard
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
