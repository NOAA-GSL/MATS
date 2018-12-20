import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

plotSpecTimeSeries = function (plotParams, key,plotSpecCallback) {
    var builder = require('xmlbuilder');
    var xml = builder.create('plot_spec',
        {version: '1.0', encoding: 'UTF-8', standalone: no});
    xml.ele('connection', {

    }).ele('host','a host name')
        .ele('database','aDataBase')
        .ele('user','some user')
        .ele('password','some password');

};