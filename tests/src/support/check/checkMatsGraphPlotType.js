/**
 * Check if the given elements contains text
 * @param  {String}   plotType  The text to check against
 */
export default (plotType) => {
    /**
     * Check that the header contains the plot type
     * @plotType {String}
     */
    const command = 'getText';

    const stringExpectedText = plotType;

    const elem = $('#header');
    elem.waitForDisplayed();
    elem.scrollIntoView();
    const text = elem[command]();

    expect(text).toContain(stringExpectedText);
};
