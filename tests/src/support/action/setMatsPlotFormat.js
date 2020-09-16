/**
 * Set the plotFormat
 * @param  {String}   plotFormat   The plot format
 * */
export default (plotFormat) => {
    switch (plotFormat) {
        case 'matching diffs':
            $('#plotFormat-radioGroup-matching').scrollIntoView();
            $('#plotFormat-radioGroup-matching').click();
            break;
        case 'pairwise diffs':
            $('#plotFormat-radioGroup-pairwise').scrollIntoView();
            $('#plotFormat-radioGroup-pairwise').click();
            break;
        case 'no diffs':
            $('#plotFormat-radioGroup-none').scrollIntoView();
            $('#plotFormat-radioGroup-none').click();
            break;
        default:
            throw new Error('invalid plotFormat in setMatsPlotFormat');
    }
};
