/**
 * Check if the given elements contains text
 * @param  {String}   elementType   Element type (element or button)
 * @param  {String}   selector       Element selector
 * @param  {String}   falseCase     Whether to check if the content contains
 *                                  the given text or not
 * @param  {String}   expectedText  The text to check against
 */
export default async (elementType, selector, falseCase, expectedText) => {
    /**
     * The command to perform on the browser object
     * @type {String}
     */
    let command = 'getValue';

    if (
        ['button', 'container'].includes(elementType)
        || await $(selector).getAttribute('value') === null
    ) {
        command = 'getText';
    }

    /**
     * False case
     * @type {Boolean}
     */
    let boolFalseCase;

    /**
     * The expected text
     * @type {String}
     */
    let stringExpectedText = expectedText;

    /**
     * The text of the element
     * @type {String}
     */
    const elem = $(selector);
    await elem.waitForDisplayed();
    await elem.scrollIntoView();
    const text = await elem[command]();

    if (typeof expectedText === 'undefined') {
        stringExpectedText = falseCase;
        boolFalseCase = false;
    } else {
        boolFalseCase = (falseCase === ' not');
    }

    if (boolFalseCase) {
        expect(text).not.toContain(stringExpectedText);
    } else {
        expect(text).toContain(stringExpectedText);
    }
};
