Modules.server.wfip2 = {};

var getDatum = function (rawAxisData, axisTime, levelCompletenessX, levelCompletenessY, siteCompletenessX, siteCompletenessY,
                         levelBasisX, levelBasisY, siteBasisX, siteBasisY) {
    // sum and average all of the means for all of the sites
    var datum = {};
    var commonSitesBasisLengthX = siteBasisX.length;
    var commonSitesBasisLengthY = siteBasisY.length;
    var tSitesX = rawAxisData['xaxis']['data'][axisTime];
    var tSitesY = rawAxisData['yaxis']['data'][axisTime];
    // Do we have enough sites (based on the quality) for this time to qualify the data for this time? We need to have enough for x AND y
    var sitesXQuality = (Object.keys(tSitesX).length / commonSitesBasisLengthX) * 100;
    if (sitesXQuality < siteCompletenessX) {
        return []; // reject this site (it does not qualify for x axis) for this time
    }
    var sitesYQuality = (Object.keys(tSitesY).length / commonSitesBasisLengthY) * 100;
    if (sitesYQuality < siteCompletenessY) {
        return []; // reject this site (it does not qualify for y axis) for this time
    }

    // still here? process the sites
    // for each axis... axisArr.length
    // for every site... tSiteIds.length
    // if completeness test not required ... qualityLevels == 0
    //      save precalculated levels
    // else
    //      recalculate level statistics
    //      save recalculated levels
    var axisArr = ['xaxis', 'yaxis'];
    for (var ai = 0; ai < axisArr.length; ai++) {   //iterate axis
        var axisStr = axisArr[ai];
        var tSiteIds = Object.keys(tSitesX);
        var commonLevelsBasisLength = levelBasisX.length;
        var qualityLevels = levelCompletenessX;
        if (axisArr[ai] == 'yaxis') {
            tSiteIds = Object.keys(tSitesY);
            commonLevelsBasisLength = levelBasisY.length;
            qualityLevels = levelCompletenessY;
        }
        var siteSum = 0;
        var siteNum = 0;
        var filteredSites = [];   // used for the modal data view
        for (var si = 0; si < tSiteIds.length; si++) {    //iterate sites
            var siteId = tSiteIds[si];
            var siteMean = 0;
            if (qualityLevels == 0) {  // no need to recalculate if everything is accepted i.e. quality = 0
                siteSum += rawAxisData[axisStr]['data'][axisTime][siteId]['mean'];
                siteNum +=  rawAxisData[axisStr]['data'][axisTime][siteId]['numLevels'];
                filteredSites = rawAxisData[axisStr]['data'][axisTime];
                //combine the levels and the values into single array (for using in the modal data view)
                filteredSites[siteId].levelsValues = filteredSites[siteId].levels.map(function(level, index) { return [level, filteredSites[siteId].values[index]] });
                rawAxisData[axisStr]['data'][axisTime][siteId].levelsValues = filteredSites[siteId].levelsValues;
            } else {
                // quality filter is required (>0)  so we have to recalculate the statistics for this site for qualified levels
                // recalculate sMean for filtered levels
                var sLevels = rawAxisData[axisStr]['data'][axisTime][siteId]['levels'];
                //combine the levels and the values into single array (for using in the modal data view) - raw values - unfiltered
                rawAxisData[axisStr]['data'][axisTime][siteId].levelsValues =
                    rawAxisData[axisStr]['data'][axisTime][siteId].levels.map(function(level, index) {
                        return [level, rawAxisData[axisStr]['data'][axisTime][siteId].values[index]];
                    });

                // What we really want is to put in a quality control
                // that says "what percentage of the commonSitesBasis set of levels does the Levels for this site and time need to be
                // in order to qualify the data?" In other words, throw away any data that doesn't meet the completeness criteria.
                var matchQuality = (sLevels.length / commonLevelsBasisLength) * 100;
                if (matchQuality < qualityLevels) {
                    continue;  // throw this site away - it does not qualify because it does not have enough levels
                }
                filteredSites = rawAxisData[axisStr]['data'][axisTime];
                filteredSites[siteId].levelsValues =
                    filteredSites[siteId].levels.map(function(level, index) {
                        return [level, filteredSites[siteId].values[index]];
                    });
                var sValues = rawAxisData[axisStr]['data'][axisTime][siteId]['values'];

                for (var li = 0; li < sLevels.length; li++) {
                    siteSum += sValues[li];
                    siteNum++;
                }
            }
        }

        siteMean = siteSum / siteNum;
        datum[axisStr + '-mean'] = siteMean;
        datum[axisStr + '-sites'] = rawAxisData[axisStr]['data'][axisTime];  // used to get levelsValues from raw data for data modal
        datum[axisStr + '-filteredSites'] = filteredSites;
    }
    return datum;
};
Modules.server.wfip2.getDatum = getDatum;

