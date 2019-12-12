/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */
import {Template} from "meteor/templating";
import {Meteor} from "meteor/meteor";
import matsMethods from "../imports/startup/api/matsMethods";

Template.Configure.helpers({
    app: function() {
        return Meteor.settings.public.title;
    },

    title: function() {
        return Meteor.settings.public.title;
    },

    roles: function() {
        if (Meteor.settings.public.undefinedRoles) {
            return Meteor.settings.public.undefinedRoles;
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
        data = {'private':{'databases':[]},'public':{}};
        const roles = Meteor.settings.public.undefinedRoles;
        // private database values
        for (var ri=0; ri < roles.length; ri++) {
            // look for all the inputs that go with this role
            const roleData = {};
            roleData['role'] = roles[ri];
            roleData['status'] = "active";   // default to active
            for (var i = 0; i < inputs.length; i++) {
                const input = inputs[i];
                name = input.id;
                value = input.value;
                if (name.indexOf(roles[ri]) != -1){
                    name = name.replace(roles[ri] + "-",'');
                    roleData[name] = value;
                }
            }
            data['private']['databases'].push(roleData);
        }
        // public values
        for (var i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            name = input.id;
            value = input.value;
            var roleVal = false;
            for (ri =0; ri < roles.length; ri++) {
                if (name.indexOf(roles[ri]) !== -1){
                    roleVal = true;
                }
            }
            if (roleVal === false) {
                data['public'][name] = value;
            }
        }
        console.log(JSON.stringify(data,null,2));
        matsMethods.applySettingsData.call( {settings:data}, function(error){
            if (error) {
                setError(new Error("matsMethods.applySettingsData error: " +error.message));
            }
        });
    },
    'click .test': function (event) {
        const role = event.target.id.replace('-test','')
        const successButton = document.getElementById(role + "-success");
        const failButton = document.getElementById(role + "-fail");
        // we have to implement the actual test here
        successButton.style.display = "block";
        failButton.style.display = "block";
    },
    'change .colorValue': function(event) {
        document.getElementById('color').value=document.getElementById('colorValue').value
    }
});