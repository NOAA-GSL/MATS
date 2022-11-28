/**
 * Select an option of a select element
 * @param  {String}   parameter Element selector label
 * @param  {String}   selectionValue Value to select by
 */
import pause from './pause';

export default (parameter, selectionValue) => {
    /**
     * The method to use for selecting the option
     * @type {String}
     */

    // console.log(`$('#controlButton-${parameter}')`);
    // console.log(`$('.select2-results__option=${selectionValue}')`);
    // console.log(`$('.select2-results__option=${selectionValue}')`);
    // browser.debug();

    // noinspection JSJQueryEfficiency
    $(`#controlButton-${parameter}`).waitForDisplayed();
    $(`#controlButton-${parameter}`).scrollIntoView();
    let len = $$(`.select2-results__option=${selectionValue}`).length;
    // it might already be clicked! Sometimes the click doesn't seem to take on the first try.
    let c = 0;
    while (len === 0 && c < 20) {
        $(`#controlButton-${parameter}`).waitForClickable();
        $(`#controlButton-${parameter}`).click();
        len = $$(`.select2-results__option=${selectionValue}`).length;
        pause(1000);
        c += 1;
    }
    let multi = false;
    if ($(`#${parameter}-select-clear`).isDisplayed()) {
        multi = true;
        // if it is a multi-select selector it has a clear button. Better clear it
        $(`#${parameter}-select-clear`).waitForClickable();
        $(`#${parameter}-select-clear`).click();
    }
    // noinspection JSJQueryEfficiency
    $(`.select2-results__option=${selectionValue}`).scrollIntoView();
    // noinspection JSJQueryEfficiency
    $(`.select2-results__option=${selectionValue}`).waitForClickable();
    $(`.select2-results__option=${selectionValue}`).click();
    if ($(`#${parameter}-select-done`).isDisplayed()) {
        // if it is a multi-select selector, have to click the done button
        $(`#${parameter}-select-done`).waitForClickable();
        $(`#${parameter}-select-done`).click();
    }

    let matchValue = selectionValue;
    if (multi === true) {
        // multi-selects have a range value
        matchValue = `${selectionValue} .. ${selectionValue}`;
    }
    let text = '';
    let count = 0;
    // this is essentially giving the parameter 20 seconds to show the new value
    // this is mostly for when it is really busy doing parallel instances
    while (count < 20 && text !== matchValue) {
        text = $(`#controlButton-${parameter}-value`).getText();
        if (text !== matchValue) {
            pause(2000);
        }
        count += 1;
    }
    if (text !== matchValue) {
        console.log(`parameter is ${parameter}, selectionValue is ${selectionValue}`);
        // browser.debug();
    }
    expect(text).toEqual(matchValue,
        `Expexted ${text} to be ${matchValue} for parameter: ${parameter}`);
};
