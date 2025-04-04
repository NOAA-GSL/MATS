/**
 * Check the curve has been added
 * @param  {String}  the label of the curve
 */

export default async (curve) => {
    const command = 'getText';
    const selector = await $(`#curveItem-${curve}`);
    /**
     * The expected text
     * @type {String}
     */
    const stringExpectedText = curve;

    /**
     * The text of the element
     * @type {String}
     */
    await selector.waitForDisplayed();
    await selector.scrollIntoView();
    const text = await selector[command]();

    expect(text).toContain(stringExpectedText);
};
