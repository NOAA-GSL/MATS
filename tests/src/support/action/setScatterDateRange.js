/**
 * Set the curve date range to a predefined range
 * @param  {String}   value   The range to set the selector to
 * */
export default (value) => {
    const dates = value.split(' - ');
    $('#controlButton-dates-value').scrollIntoView();
    $('#controlButton-dates-value').click(); // brings up date menu
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_start"]')[$$('input[name="daterangepicker_start"]').length - 3].setValue('');
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_start"]')[$$('input[name="daterangepicker_start"]').length - 3].setValue(dates[0]);
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_end"]')[$$('input[name="daterangepicker_end"]').length - 3].setValue('');
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_end"]')[$$('input[name="daterangepicker_end"]').length - 3].setValue(dates[1]);
    // eslint-disable-next-line max-len
    $$('/html/body/div[1]/div[1]/div/button')[$$('/html/body/div[3]/div[1]/div/button').length - 3].click();
};
