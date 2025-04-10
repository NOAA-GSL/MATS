/**
 * Visible state of the info modal
 * @type {String}
 */

export default async (falseCase) => {
    const selector = $('#info');
    if (falseCase) {
        const isDisplayed = await selector.isDisplayed();
        expect(isDisplayed).not.toEqual(
            true,
            'Expected info modal to NOT be displayed and it is visible'
        );
    } else {
        const ms = 120000;
        await selector.waitForDisplayed({ timeout: ms });
        const isDisplayed = await selector.isDisplayed({ timeout: ms });
        expect(isDisplayed).toEqual(
            true,
            'Expected info modal to be displayed and it is not visible'
        );
    }
};
