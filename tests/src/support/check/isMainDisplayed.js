/**
 * Check if the graph page is visible
 */
export default () => {
    /**
     * Is the main page visible?
     */
    const isDisplayed = $('#plotType').isDisplayed();

    expect(isDisplayed).toEqual(
        true,
        'Expected element "plotType" to be displayed'
    );
};
