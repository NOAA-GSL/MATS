// noinspection JSIgnoredPromiseFromCall
/** *
 * Set the date range to a predefined range
 * @param  {String}   parameterType   The type of date range selector (curve or date)
 *  @param  {String}   value   The range to set the selector to
 ** */
export default (parameterType, value) => {
    let definedRange = value;
    if (!definedRange) {
        definedRange = '';
    }
    expect(parameterType === 'curve-date' || parameterType === 'date').toEqual(
        true,
        `Expected element "${parameterType}" to be "curve-date OR date"`
    );
    if (parameterType === 'curve-date') {
        $('#controlButton-curve-dates-value').scrollIntoView();
        $('#controlButton-curve-dates-value').click(); // brings up date menu
    } else if (parameterType === 'date') {
        $('#controlButton-dates-value').scrollIntoView();
        $('#controlButton-dates-value').click();
    }
    browser.execute((dRange) => {
        // eslint-disable-next-line no-undef
        const dateRangePickers = document.getElementsByClassName('show-calendar');
        let dateRangePicker = null;
        for (let dri = 0; dri < dateRangePickers.length; dri += 1) {
            if (dateRangePickers[dri].style.display === 'block') {
                dateRangePicker = dateRangePickers[dri];
                break;
            }
        }
        expect(dateRangePicker).not.toBe(null, 'no dateRangePickerFound!');
        // noinspection JSObjectNullOrUndefined
        const liTags = dateRangePicker.getElementsByTagName('li');
        let item = null;
        for (let i = 0; i < liTags.length; i += 1) {
            if (liTags[i].textContent === dRange) {
                item = liTags[i];
                break;
            }
        }
        // noinspection JSObjectNullOrUndefined
        item.click();
    }, definedRange);
};
