/**
 * Check if the given elements contains text
 * @param  {number}   curveNumber  The text to check against
 */
export default async (curveNumber) => {
    /**
     * Check that the graph contains curveNumber of curves
     * @curveNumber {Number}
     * @type {String}
     */
    await $('#curves').waitForDisplayed(20000);
    await $('#curves').scrollIntoView();
    // use the heatMapVisibility button (it's a unique selector) to count the curves
    const curveItems = await $$('.traces');
    // eslint-disable-next-line no-template-curly-in-string
    expect(curveItems).toHaveLength(curveNumber, 'Should have "${curveNumber}" curves');
};
