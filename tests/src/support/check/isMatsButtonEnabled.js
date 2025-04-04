/**
 * Check if the given MATS button is enabled
 * @param  {String}   buttonLabel   Button label
 * @param  {String}   falseCase     Whether to check if the button is enabled or not
 * */
export default async (buttonLabel, falseCase) => {
    /**
     * Visible state of the give element
     * @type {String}
     * @type {Boolean}
     */
    let selector;
    let boolFalseCase;
    switch (buttonLabel) {
        case 'Add Curve':
            selector = $('#add');
            break;
        case 'Back':
            selector = $('#backButton');
            break;
        case 'Plot Matched':
            selector = $('#plotMatched');
            break;
        case 'Plot Unmatched':
            selector = $('#plotUnmatched');
            break;
        default:
    }

    if (typeof falseCase === 'undefined') {
        boolFalseCase = false;
    } else {
        boolFalseCase = !!falseCase;
    }
    if (boolFalseCase) {
        const isEnabled = await selector.isEnabled();
        expect(isEnabled).toEqual(
            false,
            `Expected element "${buttonLabel}" to be enabled`
        );
    } else {
        const isEnabled = await selector.waitForEnabled();
        expect(isEnabled).toEqual(
            true,
            `Expected element "${buttonLabel}" to be enabled`
        );
    }
};
