/*
 * Copyright (c) 2019. Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import '../../ui/layouts/versions.js';

FlowRouter.route('/versions', {
    name: 'versions',
    action() {
        BlazeLayout.render('versions', { main: 'versions' });
    },
});
