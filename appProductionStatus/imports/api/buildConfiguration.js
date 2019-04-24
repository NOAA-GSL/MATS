/*
 * Copyright (c) 2019. Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';

export const BuildConfiguration = new Mongo.Collection('buildConfiguration');
export const AllowedUsers = new Mongo.Collection('allowedUsers');
if (Meteor.isServer) {
    Meteor.publish('BuildConfiguration', function buildConfigurationPublication() {
        var user = null;
        if (this.userId !== undefined && Meteor.users.findOne({_id:this.userId}) !== undefined) {
            user = Meteor.users.findOne({_id:this.userId}).username;
        }
        if (!user || !AllowedUsers.findOne({user:user})) {
            return this.ready();
        }
        BuildConfiguration.allow({
            insert: function (doc) {
                return true;
            },

            update: function (doc, fieldNames, modifier) {
                return true;
            },

            remove: function (doc) {
                return true;
            }
        });
        return BuildConfiguration.find({});
    });
}

Meteor.methods({
    // 'buildConfiguration.insert'(text) {
    //   check(text, String);
    //
    //   BuildConfiguration.insert({
    //     text,
    //     createdAt: new Date(),
    //     owner: this.userId,
    //     username: Meteor.users.findOne(this.userId).username,
    //   });
    // }
});
