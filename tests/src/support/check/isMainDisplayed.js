/**
 * Check if the graph page is visible
 */
export default async () => {
    /**
     * Is the main page visible?
     */
    const isDisplayed = await $('#plotType').isDisplayed();

    expect(isDisplayed).toEqual(
        true,
        'Expected element "plotType" to be displayed'
    );
};
