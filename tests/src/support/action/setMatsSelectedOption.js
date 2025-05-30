/**
 * Select an option of a select element
 * @param  {String}   parameter Element selector label
 * @param  {String}   selectionValue Value to select by
 */
import pause from './pause';

export default async (parameter, selectionValue) => {
    /**
     * The method to use for selecting the option
     * @type {String}
     */

    // console.log(`$('#controlButton-${parameter}')`);
    // console.log(`$('.select2-results__option=${selectionValue}')`);
    // console.log(`$('.select2-results__option=${selectionValue}')`);
    // browser.debug();

    // noinspection JSJQueryEfficiency
    await $(`#controlButton-${parameter}`).waitForDisplayed();
    await $(`#controlButton-${parameter}`).scrollIntoView();
    let len = await $$(`.select2-results__option=${selectionValue}`).length;
    // it might already be clicked! Sometimes the click doesn't seem to take on the first try.
    let c = 0;
    while (len === 0 && c < 20) {
        await $(`#controlButton-${parameter}`).waitForClickable();
        await $(`#controlButton-${parameter}`).click();
        len = await $$(`.select2-results__option=${selectionValue}`).length;
        pause(1000);
        c += 1;
    }
    let multi = false;
    if (await $(`#${parameter}-select-clear`).isDisplayed()) {
        multi = true;
        // if it is a multi-select selector it has a clear button. Better clear it
        await $(`#${parameter}-select-clear`).scrollIntoView();
        await $(`#${parameter}-select-clear`).waitForClickable();
        await $(`#${parameter}-select-clear`).click();
    }
    // noinspection JSJQueryEfficiency
    await $(`.select2-results__option=${selectionValue}`).scrollIntoView();
    await $(`.select2-results__option=${selectionValue}`).waitForClickable();
    await $(`.select2-results__option=${selectionValue}`).click();
    if (multi) {
        // if it is a multi-select selector, have to click the done button
        await $(`#${parameter}-select-done`).scrollIntoView();
        await $(`#${parameter}-select-done`).waitForClickable();
        await $(`#${parameter}-select-done`).click();
    }

    let matchValue = selectionValue;
    if (multi) {
        // multi-selects have a range value
        matchValue = `${selectionValue} .. ${selectionValue}`;
    }
    let text = '';
    let count = 0;
    // this is essentially giving the parameter 60 seconds to show the new value
    // this is mostly for when it is really busy doing parallel instances
    while (count < 30 && text !== matchValue) {
        text = await $(`#controlButton-${parameter}-value`).getText();
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
