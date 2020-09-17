/**
 * Open the given URL
 * @param  {String}   page The URL to navigate to
 */

export default (page) => {
    /**
     * The URL to navigate to
     * @type {String}
     */
    const url = browser.options.baseUrl + page;
    browser.url(url);
    const ms = 120000;
    // wait for the curve label selector to exist
    // noinspection JSJQueryEfficiency
    $('#controlButton-label-value').waitForExist({ timeout: ms });
    // noinspection JSJQueryEfficiency
    $('#controlButton-label-value').waitForEnabled({ timeout: ms });
    $('#controlButton-label-value').waitForClickable({ timeout: ms });
};
