/**
 * Check if the graph page becomes visible
 */

import pause from '../action/pause';

export default () => {
    /**
     * Is the graph page visible within ms milliseconds?
     */

    let count = 0;
    let isDisplayed = false;
    while (count < 10 && isDisplayed !== true) {
        isDisplayed = $('#graph-container').waitForDisplayed();
        if (isDisplayed !== true) {
            pause(1000);
        }
        count += 1;
    }
    expect(isDisplayed).toEqual(
        true,
        'Expected element "#graph-container" to be displayed'
    );
};
