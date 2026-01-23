/**
 * Open the given URL
 * @param  {String}   page The URL to navigate to
 */

export default async (page) => {
    /**
     * The URL to navigate to
     * @type {String}
     */
    const url = browser.options.baseUrl;
    if (url.includes("localhost")) {
        await browser.url(url);
    } else {
        await browser.url(url + page);
    }
    const ms = 30000;
    // wait for the curve label selector to exist
    // noinspection JSJQueryEfficiency
    await $('#controlButton-label-value').waitForExist({ timeout: ms });
    // noinspection JSJQueryEfficiency
    await $('#controlButton-label-value').waitForEnabled({ timeout: ms });
    await $('#controlButton-label-value').waitForClickable({ timeout: ms });
};
