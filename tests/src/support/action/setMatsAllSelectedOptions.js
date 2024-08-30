/**
 * Select an option of a select element
 * @param  {String}   parameter Element selector label
 */

export default (parameter) => {
    /**
     * The method to use for selecting the option
     * @type {String}
     */

    // noinspection JSJQueryEfficiency
    $(`#controlButton-${parameter}`).waitForDisplayed();
    $(`#controlButton-${parameter}`).scrollIntoView();
    $(`#controlButton-${parameter}`).click();
    if ($(`#${parameter}-select-clear`).isDisplayed()) {
        $(`#${parameter}-select-clear`).waitForClickable();
        $(`#${parameter}-select-clear`).click();
    }
    if ($(`#${parameter}-select-all`).isDisplayed()) {
        $(`#${parameter}-select-all`).waitForClickable();
        $(`#${parameter}-select-all`).click();
    }
    if ($(`#${parameter}-select-done`).isDisplayed()) {
        // if it is a multi-select selector, have to click the done button
        $(`#${parameter}-select-done`).waitForClickable();
        $(`#${parameter}-select-done`).click();
    }
};
