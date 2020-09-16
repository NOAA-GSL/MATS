/**
 * Check if the given elements contains text
 * @param  {number}   curveNumber  The text to check against
 */
export default (curveNumber) => {
    /**
     * Check that the graph contains curveNumber of curves
     * @curveNumber {Number}
     * @type {String}
     */
    $('#curves').waitForDisplayed(20000);
    // use the heatMapVisibility button (it's a unique selector) to count the curves
    const curveItems = $$('.traces');
    // eslint-disable-next-line no-template-curly-in-string
    expect(curveItems).toHaveLength(curveNumber, 'Should have "${curveNumber}" curves');
};
