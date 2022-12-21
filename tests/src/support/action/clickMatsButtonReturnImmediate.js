/**
 * Perform an click action on the button with the given label
 * @param  {String}   label button label
 */
export default (label) => {
    /**
     * LabelOf the Mats button to click
     * @type {String}
     */
    const method = 'click';
    let selector;
    let nrOfElements;
    let cPart;
    // special buttons first
    if (label === 'Remove All') {
        nrOfElements = $$('#remove-all').length;
        $('#remove-all')[method]();
    } else if (label === 'Remove all the curves') {
        nrOfElements = $$('#confirm-remove-all').length;
        // I don't know why there are two of the confirm buttons
        // there has to be a better way to handle this
        $$('#confirm-remove-all')[1][method]();
    } else if (label.match('Remove curve .*')) {
        // this is the 'Remove curve curvelabel' confirm button
        cPart = label.replace('Remove curve ', '');
        nrOfElements = $$(`#confirm-remove-curve*=${cPart}`).length;
        expect(nrOfElements).toBeGreaterThan(0, `Expected an "${selector}" button to exist`);
        $$(`#confirm-remove-curve*=${cPart}`)[1].waitForDisplayed();
        $$(`#confirm-remove-curve*=${cPart}`)[1].scrollIntoView();
        $$(`#confirm-remove-curve*=${cPart}`)[1].click();
    } else if (label.match('Remove .*')) {
        // This is the 'Remove curvelabel' remove button
        cPart = label.replace('Remove ', '');
        nrOfElements = $$(`#curve-list-remove*=${cPart}`).length;
        expect(nrOfElements).toBeGreaterThan(0, `Expected an "${selector}" button to exist`);
        $(`#curve-list-remove*=${cPart}`)[method]();
    } else {
        // normal buttons
        switch (label) {
            case 'Add Curve':
                selector = $('#add');
                selector.waitForDisplayed();
                selector.scrollIntoView();
                nrOfElements = $$('#add').length;
                break;
            case 'Back':
                selector = $('#backButton');
                selector.waitForDisplayed();
                selector.scrollIntoView();
                nrOfElements = $$('#backButton').length;
                break;
            case 'Plot Unmatched':
                selector = $('#plotUnmatched');
                selector.waitForDisplayed();
                selector.scrollIntoView();
                nrOfElements = $$('#plotUnmatched').length;
                break;
            case 'Plot Matched':
                selector = $('#plotMatched');
                selector.waitForDisplayed();
                selector.scrollIntoView();
                nrOfElements = $$('#plotMatched').length;
                break;
            case 'Reset to Defaults':
                selector = $('#reset');
                selector.waitForDisplayed();
                selector.scrollIntoView();
                nrOfElements = $$('#reset').length;
                break;
            case 'Clear':
                selector = $('#clear-info');
                selector.waitForDisplayed();
                selector.scrollIntoView();
                nrOfElements = $$('#clear-info').length;
                break;
            default:
                throw new Error('Unhandled button label???');
        }
        // these are for the switch statement i.e. 'normal buttons'
        expect(nrOfElements).toBeGreaterThan(0, `Expected an "${selector}" button to exist`);
        selector[method]();
    }
};
