import pause from '../action/pause';

export default (parameter, value) => {
    /**
     * Check the selected state of the given element
     * @param  {String}   parameter   paramaeter
     * @param  {String}   value the selected option
     */
    $(`#controlButton-${parameter}-value`).waitForDisplayed();
    $(`#controlButton-${parameter}-value`).scrollIntoView();
    let count = 0;
    let text = '';
    while (count < 10 && text !== value) {
        text = $(`#controlButton-${parameter}-value`).getText();
        if (text !== value) {
            pause(1000);
        }
        count += 1;
    }
    expect(text).toEqual(value, `Expexted ${text} to be ${value} for parameter: ${parameter}`);
};
