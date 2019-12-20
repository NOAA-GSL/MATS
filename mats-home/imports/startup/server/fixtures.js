
import { Meteor } from 'meteor/meteor';
import {Groups} from "../../api/groups.js";

Meteor.startup(() => {
  try {
    const env = process.env.DEPLOYMENT_ENVIRONMENT;
    const groupOrderStr = process.env.GROUP_ORDER == undefined ? "Upper Air,Ceiling and Visibility,Surface,Precipitation,Radar,METexpress" : process.env.GROUP_ORDER;
    var group_order = groupOrderStr.split(',');
    const fs = require('fs');
    Groups.remove({});
    const allSettings = fs.readdirSync('/usr/app/settings')
    allSettings.forEach(function (appSettingsDir) {
      try {
        //console.log("processing settings file: " + '/usr/app/settings/' + appSettingsDir + "/settings.json");
        const appSettingsData = fs.readFileSync('/usr/app/settings/' + appSettingsDir + "/settings.json");
        const appSettings = JSON.parse(appSettingsData);
        /* These settings files should be set at installation time
        either through compose file or helm chart or manually.

        Each settings file should be like .....
{
  "private": {
    "databases": [
      {
        "role": "",
        "status": "",
        "host": "",
        "port": "",
        "user": "",
        "password": "",
        "database": "",
        "connectionLimit": 4
      }
    ],
    "process": {
      "RUN_ENV": "development"
    },
    "PYTHON_PATH": "/usr/bin/python3"
  },
  "public": {
    "deployment_environment": "development",
    "proxy_prefix_path": "matsdev",
    "home": "https://mats-docker-dev.gsd.esrl.noaa.gov/matsdev/home",
    "mysql_wait_timeout": 300,
    "group": "METexpress",
    "title": "MET Air Quality",
    "color": "darkorchid"
  }
}
        The private.databases array will be empty until it is configured, either by hand, or by the configuration page.

         */
        var item = appSettings.public;
        item['app'] = appSettingsDir;  // the settings directory is named after the app reference
        var groupIndex = group_order.indexOf(item['group']);
        if (groupIndex === -1) {
          group_order.push(item['group']);
        }
        groupIndex = group_order.indexOf(item['group']);
        var group = Groups.findOne({groupOrder: groupIndex});
        if (group === undefined) {
          // create and insert new group
          if (item.deployment_environment === env) {
            var appList = [item];
            var group = {groupOrder: groupIndex, groupName: item['group'], appList: appList};
            Groups.insert(group);
          }
        } else {
          var newAppList = group.appList;
          if (item.deployment_environment === env) {
            newAppList.push(item);
            Groups.update({_id: group._id}, {$set: {appList: newAppList}});
          }
        }
      } catch (error) {
        throw new Meteor.Error("Error processing settings file:\n /usr/app/settings/" + appSettingsDir + "/settings.json" + ":\n" + error.message);
      }
    });
    //console.log("Groups are:" + JSON.stringify(Groups.find().fetch(), null, 2));
    Meteor.publish('Groups', function () {
      var data = Groups.find({});
      if (data) {
        return data;
      }
      return this.ready();
    });
  } catch (error) {
    console.log("Error loading app: ", error.message);
    throw new Meteor.Error('Error loading app: ', error.message);
  }
});
