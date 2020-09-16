/**
 * Visible state of the info modal
 * @type {String}
 */

export default (falseCase) => {
    const selector = $('#info');
    if (falseCase) {
        const isDisplayed = selector.isDisplayed();
        expect(isDisplayed).not.toEqual(
            true,
            'Expected info modal to NOT be displayed and it is visible'
        );
    } else {
        const ms = 120000;
        selector.waitForDisplayed({ timeout: ms });
        const isDisplayed = selector.isDisplayed({ timeout: ms });
        expect(isDisplayed).toEqual(
            true,
            'Expected info modal to be displayed and it is not visible'
        );
    }
};
