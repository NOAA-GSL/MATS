import { Template } from "meteor/templating";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./appBody.html";

Template.AppBody.onCreated(function () {
    console.log("in AppBody onCreated");
});