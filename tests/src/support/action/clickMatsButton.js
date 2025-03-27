/**
 * Perform an click action on the button with the given label
 * @param  {String}   label button label
 */
export default async (label) => {
    /**
     * LabelOf the Mats button to click
     * @type {String}
     */
    let selector;
    let nrOfElements;
    let cPart;
    // special buttons first
    if (label === 'Remove All') {
        nrOfElements = await $$('#remove-all').length;
        await $('#remove-all').waitForClickable();
        await $('#remove-all').click();
    } else if (label === 'Remove all the curves') {
        nrOfElements = await $$('#confirm-remove-all').length;
        // I don't know why there are two of the confirm buttons
        // there has to be a better way to handle this
        await $$('#confirm-remove-all')[1].waitForClickable();
        await $$('#confirm-remove-all')[1].click();
    } else if (label.match('Remove curve .*')) {
        // this is the 'Remove curve curvelabel' confirm button
        cPart = label.replace('Remove curve ', '');
        nrOfElements = await $$(`#confirm-remove-curve*=${cPart}`).length;
        expect(nrOfElements).toBeGreaterThan(0, `Expected an "${selector}" button to exist`);
        await $$(`#confirm-remove-curve*=${cPart}`)[1].waitForDisplayed();
        await $$(`#confirm-remove-curve*=${cPart}`)[1].scrollIntoView();
        await $$(`#confirm-remove-curve*=${cPart}`)[1].waitForClickable();
        await $$(`#confirm-remove-curve*=${cPart}`)[1].click();
    } else if (label.match('Remove .*')) {
        // This is the 'Remove curvelabel' remove button
        cPart = label.replace('Remove ', '');
        nrOfElements = await $$(`#curve-list-remove*=${cPart}`).length;
        expect(nrOfElements).toBeGreaterThan(0, `Expected an "${selector}" button to exist`);
        await $(`#curve-list-remove*=${cPart}`).waitForClickable();
        await $(`#curve-list-remove*=${cPart}`).click();
    } else {
        // normal buttons
        switch (label) {
            case 'Add Curve':
                selector = await $('#add');
                await selector.waitForDisplayed();
                await selector.scrollIntoView();
                nrOfElements = await $$('#add').length;
                break;
            case 'Back':
                selector = await $('#backButton');
                await selector.waitForDisplayed();
                await selector.scrollIntoView();
                nrOfElements = await $$('#backButton').length;
                break;
            case 'Plot Unmatched':
                selector = await $('#plotUnmatched');
                await selector.waitForDisplayed();
                await selector.scrollIntoView();
                nrOfElements = await $$('#plotUnmatched').length;
                break;
            case 'Plot Matched':
                selector = await $('#plotMatched');
                await selector.waitForDisplayed();
                await selector.scrollIntoView();
                nrOfElements = await $$('#plotMatched').length;
                break;
            case 'Reset to Defaults':
                selector = await $('#reset');
                await selector.waitForDisplayed();
                await selector.scrollIntoView();
                nrOfElements = await $$('#reset').length;
                break;
            case 'Clear':
                selector = await $('#clear-info');
                await selector.waitForDisplayed();
                await selector.scrollIntoView();
                nrOfElements = await $$('#clear-info').length;
                break;
            default:
                throw new Error('Unhandled button label???');
        }
        // these are for the switch statement i.e. 'normal buttons'
        expect(nrOfElements).toBeGreaterThan(0, `Expected an "${selector}" button to exist`);
        await selector.waitForClickable();
        await selector.click();
    }
};
