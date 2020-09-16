/**
 * Clear a given input parameter
 * @param  {String}   parameter Element selector
 */
export default (parameter) => {
    $(`[id='controlButton-${parameter}-value']`).scrollIntoView();
    $(`#controlButton-${parameter}-value`).click();
    if ($(`[id*='${parameter}-select-clear']`).waitForDisplayed()) {
        $(`[id*='${parameter}-select-clear']`).click();
    }
    $(`#controlButton-${parameter}-value`).click();
};
