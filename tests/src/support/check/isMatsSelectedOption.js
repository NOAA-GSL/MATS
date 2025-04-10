import pause from '../action/pause';

export default async (parameter, value) => {
    /**
     * Check the selected state of the given element
     * @param  {String}   parameter   paramaeter
     * @param  {String}   value the selected option
     */
    await browser.pause(100); // TODO - this is flaky without a slight pause
    await $(`#controlButton-${parameter}-value`).waitForDisplayed();
    await $(`#controlButton-${parameter}-value`).scrollIntoView();
    let count = 0;
    let text = '';
    while (count < 10 && text !== value) {
        text = await $(`#controlButton-${parameter}-value`).getText();
        if (text !== value) {
            if (text.includes(" .. ") && !value.includes(" .. ")) {
                // this is a multiselect, which have different display formats than regular selectors.
                // we need to reformat our expected value to match.
                value = value + " .. " + value;
            }
            pause(1000);
        }
        count += 1;
    }
    expect(text).toEqual(value, `Expected ${text} to be ${value} for parameter: ${parameter}`);
};
