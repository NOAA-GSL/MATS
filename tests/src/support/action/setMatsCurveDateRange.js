import pause from './pause';

/**
 * Set the curve date range to a predefined range
 * @param  {String}   value   The range to set the selector to
 * */
export default (value) => {
    const dateRange = value;
    const dateCharArray = dateRange.split('');
    $('#controlButton-curve-dates-value').waitForDisplayed();
    $('#controlButton-curve-dates-value').scrollIntoView();
    $('#controlButton-curve-dates-value').waitForClickable();
    $('#controlButton-curve-dates-value').click();
    $('#curve-dates-dateRange').click(); // brings up date menu
    browser.keys(['Meta', 'a']);
    browser.keys("Backspace");
    browser.keys(dateCharArray);
    $('#curve-dates-applyBtn').click();
    let datesValue = '';
    let count = 0;
    while (count < 10 && datesValue !== dateRange) {
        datesValue = $('#controlButton-curve-dates-value').getText();
        if (datesValue !== dateRange) {
            pause(2000);
        }
        count += 1;
    }
    if (datesValue !== dateRange) {
        console.log(`value is ${value}`);
        // browser.debug();
    }
    expect(datesValue).toEqual(value, `"curve date range" should be ${value} but was ${datesValue}`);
};
