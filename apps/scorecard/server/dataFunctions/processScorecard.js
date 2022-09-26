processScorecard = function (plotParams, plotFunction) {
    // create or retrieve the scorecard document
    let scoreCardDocument = {}
    scoreCardDocument['user'] = plotParams['curves'][0]['user'];
    scoreCardDocument['re']
    // process the scoreCardDocument
/*
plotParams
{plotTypes: {…}, curves: Array(2), plotAction: 'scorecard', date-range-custom-relative: 'custom', date-range: '08/26/2022 20:30 - 09/25/2022 21:30', …}
completeness: '0'
curves: (2) [{…}, {…}]
0: {label: 'Row0', application: 'Surface', user: 'anom', data-source: 'RAP_OPS', validation-data-source: 'HRRR_OPS', …}
application: 'Surface'
color: 'rgb(255,0,0)'
data-source: 'RAP_OPS'
forecast-length: (1) ['0']
label: 'Row0'
region: (1) ['All HRRR domain']
statistic: (1) ['RMSE']
truth: (1) ['METAR']
user: 'anom'
valid-time: 'unused'
validation-data-source: 'HRRR_OPS'
variable: (1) ['10m wind']
__proto__: Object
1: {label: 'Row1', application: 'Surface', user: 'anom', data-source: 'RAP_OPS', validation-data-source: 'HRRR_GSL', …}
application: 'Surface'
color: 'rgb(0,0,255)'
data-source: 'RAP_OPS'
forecast-length: (1) ['0']
label: 'Row1'
region: (1) ['All HRRR domain']
statistic: (1) ['RMSE']
truth: (1) ['METAR']
user: 'anom'
valid-time: 'unused'
validation-data-source: 'HRRR_GSL'
variable: (1) ['10m wind']
__proto__: Object
__proto__: Array(0)
__proto__: Object
length: 2
date-range: '08/26/2022 20:30 - 09/25/2022 21:30'
date-range-custom-relative: 'custom'
noGapsCheck: false
outliers: 'all'
outliers-lite: 'all'
plotAction: 'scorecard'
plotTypes: {Scorecard: true}
relative-day: 'Every'
relative-day-of-month: 'Every'
relative-hour: 'Every'
relative-month: 'Every'
relative-type: 'hours'
relative-value: '1'
relative-year: '2022'
__proto__: Object

*/
    // display the scorecard status page
    plotFunction(scoreCard);
}