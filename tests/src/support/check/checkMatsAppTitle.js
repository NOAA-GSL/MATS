/**
 * Check the title (in the plottype element)
 * @param  {String}   title the selection parameter
 */
export default async (title) => {
    const command = 'getText';

    /**
     * The expected text
     * @type {String}
     */
    const stringExpectedText = title;

    /**
     * The text of the element
     * @type {String}
     */
    const elem = await $('#appTitleText');
    await elem.waitForDisplayed();
    await elem.scrollIntoView();
    const text = await elem[command]();

    expect(text).toContain(stringExpectedText);
};
