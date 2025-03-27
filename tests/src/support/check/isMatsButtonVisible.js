/**
 * Check if the given MATS button is visible
 * @param  {String}   buttonLabel   Button label */
export default async (buttonLabel) => {
    /**
     * Visible state of the give element
     * @type {String}
     */
    let selector;
    if (buttonLabel === 'Remove All') {
        selector = await $('#remove-all');
    } else if (buttonLabel === 'Remove all the curves') {
        // this is the 'Remove all the curves' confirm button
        // I don't know why there are two of the confirm buttons
        // there has to be a better way to handle this
        // eslint-disable-next-line prefer-destructuring
        selector = await $$('#confirm-remove-all')[1];
    } else if (buttonLabel.match('Remove curve .*')) {
        // this is the 'Remove curve curvelabel' confirm button
        // $$('#curve-list-remove*=Curve0').length
        const cPart = buttonLabel.replace('Remove curve ', '');
        // eslint-disable-next-line no-template-curly-in-string
        selector = await $(`#curve-list-remove*=${cPart}`);
    } else if (buttonLabel.match('Remove .*')) {
        // This is the 'Remove curvelabel' remove button
        // $$('#curve-list-remove*=Curve0').length
        const cPart = buttonLabel.replace('Remove ', '');
        // eslint-disable-next-line no-template-curly-in-string
        selector = await $(`#curve-list-remove*=${cPart}`);
    } else {
        switch (buttonLabel) {
            case 'Add Curve':
                selector = await $('#add');
                break;
            case 'Back':
                selector = await $('#backButton');
                break;
            case 'Plot Matched':
                selector = await $('#plotMatched');
                break;
            case 'Plot Unmatched':
                selector = await $('#plotUnmatched');
                break;
            default:
        }
    }
    const ms = 10000;
    await selector.waitForDisplayed({ timeout: ms });
    const isDisplayed = await selector.isDisplayed({ timeout: ms });
    expect(isDisplayed).toEqual(
        true,
        `Expected element "${buttonLabel}" to be displayed`
    );
};
