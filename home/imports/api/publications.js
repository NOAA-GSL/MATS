/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

// All Groups-related publications

import { Meteor } from 'meteor/meteor';
import { Groups } from './groups.js';

Meteor.publish('groups', function () {
  return Groups.find();
});
