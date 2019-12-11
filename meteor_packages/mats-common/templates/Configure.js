/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */
import {Template} from "meteor/templating";
import {Meteor} from "meteor/meteor";

Template.Configure.helpers({
    app: function() {
        return Meteor.settings.public.title;
    },

    title: function() {
        return Meteor.settings.public.title;
    },

    roles: function() {
        if (Meteor.settings.public.undefinedPools) {
            return Meteor.settings.public.undefinedPools;
        } else {
            return [];
        }
    },

    role: function() {
        return this;
    },

    status: function() {
        return "active";
    },

    group: function() {
        return Meteor.settings.public.group;
    },

    color: function() {
        return Meteor.settings.public.color;
    }
});

Template.Configure.events({
    'submit .configure-settings-form'(event) {
        // Prevent default browser form submit
        event.preventDefault();
        // Get value from form element
        const target = event.target;
        const inputs = target.getElementsByTagName("input");
    }
});