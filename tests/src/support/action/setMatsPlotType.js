/**
 * Set the date range to a predefined range
 * @param  {String}   plotType   The type of date range selector (curve or date)
 * */
export default (plotType) => {
    switch (plotType) {
        case 'TimeSeries':
            $('#plot-type-TimeSeries').click();
            break;
        case 'Profile':
            $('#plot-type-Profile').click();
            break;
        case 'DieOff':
            $('#plot-type-DieOff').click();
            break;
        case 'Threshold':
            $('#plot-type-Threshold').click();
            break;
        case 'ValidTime':
            $('#plot-type-ValidTime').click();
            break;
        case 'GridScale':
            $('#plot-type-GridScale').click();
            break;
        case 'DailyModelCycle':
            $('#plot-type-DailyModelCycle').click();
            break;
        case 'Reliability':
            $('#plot-type-Reliability').click();
            break;
        case 'ROC':
            $('#plot-type-ROC').click();
            break;
        case 'Map':
            $('#plot-type-Map').click();
            break;
        case 'Histogram':
            $('#plot-type-Histogram').click();
            break;
        case 'EnsembleHistogram':
            $('#plot-type-EnsembleHistogram').click();
            break;
        case 'Contour':
            $('#plot-type-Contour').click();
            break;
        case 'ContourDiff':
            $('#plot-type-ContourDiff').click();
            break;
        case 'Scatter2d':
            $('#plot-type-Scatter2d').click();
            break;
        default:
            throw new Error('invalid plotType in setMatsPlotType');
    }
};
