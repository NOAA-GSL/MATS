/**
 * Check the curve has been added
 * @param  {String}  the label of the curve
 */

export default (curve) => {
    const command = 'getText';
    const selector = $(`#curveItem-${curve}`);
    /**
     * The expected text
     * @type {String}
     */
    const stringExpectedText = curve;

    /**
     * The text of the element
     * @type {String}
     */
    selector.waitForDisplayed();
    selector.scrollIntoView();
    const text = selector[command]();

    expect(text).toContain(stringExpectedText);
};
