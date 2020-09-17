import pause from './pause';

/**
 * Set the curve date range to a predefined range
 * @param  {String}   value   The range to set the selector to
 * */
export default (value) => {
    const dateRange = value;
    const dates = dateRange.split(' - ');
    $('#controlButton-curve-dates-value').waitForDisplayed();
    $('#controlButton-curve-dates-value').scrollIntoView();
    $('#controlButton-curve-dates-value').waitForClickable();
    $('#controlButton-curve-dates-value').click(); // brings up date menu
    $$('input[name="daterangepicker_start"]')[0].setValue('');
    $$('input[name="daterangepicker_start"]')[0].setValue(dates[0]);
    $$('input[name="daterangepicker_end"]')[0].setValue('');
    $$('input[name="daterangepicker_end"]')[0].setValue(dates[1]);
    $$('/html/body/div[2]/div[1]/div/button[1]')[0].waitForClickable();
    $$('/html/body/div[2]/div[1]/div/button[1]')[0].click();
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

    expect(datesValue).toEqual(value,
        `"curve date range" should be ${value} but was ${datesValue}`);
};
