#!/usr/bin/env python
"""
This script determines the the models for a databse that has been updated as a result
of an mv_load operation. It then passes a list of database model pairs to the selective_update_metadata
scripts that are associated with each METexpress app.

Arguments: mv_database_name - the database that was specified in an mv_load operation, metexpress_base_url_list
Usage: MEmetedata_update.py mv_gsd, https://metexpress.nws.noaa.gov
Outputs: return code 0 success, 1 error
Transformations:
1) The script will retrieve the latest run_finish_time from the mats_metadata.run_stats
table with a status of 0 (success).
SQL:
select distinct run_finish_time from mats_metadata.run_stats where database_name = 'mv_gsd'
    and status = 0 order by run_finish_time desc limit 1;

If the table does not exist it will be created by ...
SQL:
create table mats_metadata.run_stats
(
  run_start_time  datetime    null,
  run_finish_time datetime    null,
  database_name   varchar(50) null,
  status          varchar(30)
) comment 'keep track of matadata_upate stats - status one of started|waiting|succeeded|failed';

and the retrieved run_finish_time will be the initial epoch, 0 i.e. Thu, 1 Jan 1970 00:00:00 GMT

2) The script will retrieve the slective_update classes from the metexpress module using inspect, and the apprefs and associated data_table_patterns
(there may be more than one in a comma seperated list) from getters in each update class, and populate the mats_metadata.metadata_script_info table.
SQL:
select * from mats_metadata.metadata_script_info
If the table does not exist it will be created by
create table metadata_script_info
(
  apref                   varchar(50)  null,
  running                 BOOLEAN      False
);
and populated with ...
INSERT INTO mats_metadata.metadata_script_info (apref,  running)
    VALUES ('met-anomalycor', False);
INSERT INTO mats_metadata.metadata_script_info (apref, data_table_pattern_list, app_reference, running)
    VALUES ('met-surface', False);
INSERT INTO mats_metadata.metadata_script_info (apref, data_table_pattern_list, app_reference, running)
    VALUES ('met-upperair', False);
NOTE: The import and inspect mechanisms will depend on the metexpress module being updated whenever a new app and metadata script
is added.
3) The script will use the run_finish_time, the data_table_pattern, and the mv_database_name to form a multiselect query
that will return the models within the given database that were updated since the run_finish_time.
i.e. select distinct data_file_id from mv_gsd.data_file where load_date > "2018-11-13 13:02:00"
...the mv_gsd would be the database name and the  2018-11-13 13:02:00 would be the last run_finish_time...
would retrieve the data_file_ids modified since the run_finish_time,
and select stat_header_id from mv_gsd.line_data_sl1l2 where data_file_id in data_file_ids
... would retireve the stat_headers associated with those data_file_ids,
and select distinct model from mv_gsd.stat_header where stat_header_id in (the list of stat_header_ids)
... would retirve the affected model names.
i.e.
select distinct model
from mv_gsd.stat_header
where stat_header_id in (select stat_header_id
                         from mv_gsd.line_data_sl1l2
                         where data_file_id in (select distinct data_file_id
                                                from mv_gsd.data_file
                                                where load_date > '2018-11-13 13:02:00'));
...the mv_gsd would be the database name, the line_data_sl1l2 is the data_table_pattern,
    and the  2018-11-13 20:05:00 would be the last run_finish_time.
This query should return the models that have been modified in the given database
since the last time the metadata update was sucessfully run.
The script will create a list of db, model pairs that can be used with each of the selective_update_MExxxx scripts.

5) The script will then call each of the selective_update_MExxxx scripts (from mats_metadata.metadata_script_info table)
with the usage: ./selective_update_MEanomalycor.py path_to_file.cnf refresh_metadata_url db.model1,db.model2,...
The refresh_metadata_url is derived from the metexpress_base_url and the appref. e.g. https://metexpress.nws.noaa.gov/met-upperair/refreshMetadata
7) Finally the script will update the run_stats table with the completion time and status. Staus 0 success, 1 error.

Author: Molly B Smith, Randy Pierce
"""

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.

from __future__ import print_function

import importlib
import inspect
import os
import pkgutil
import sys
import time
import traceback
from datetime import datetime
from multiprocessing import Process

import pymysql

import metexpress


class metadatUpdate:
    def __init__(self, cnf_file, db_name, metexpress_base_url):
        self.metadata_database = "tmp_mats_metadata"
        self.updater_list = []
        self.cnf_file = cnf_file
        self.db_name = db_name
        self.metexpress_base_url = metexpress_base_url
        if not os.path.isfile(cnf_file):
            raise ValueError("cnf file: " + cnf_file + " is not a file - exiting")

        self.cnx = pymysql.connect(read_default_file=self.cnf_file,
                              cursorclass=pymysql.cursors.DictCursor)
        self.cnx.autocommit = True
        self.cursor = self.cnx.cursor(pymysql.cursors.DictCursor)

        self.cursor.execute('show databases like "' + self.metadata_database + '";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            create_db_query = 'create database ' + self.metadata_database + ';'
            self.cursor.execute(create_db_query)
            self.cnx.commit()

        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()

        # see if the metadata tables already exist
        print("Checking for metadata_script_info tables")
        self.cursor.execute('show tables like "metadata_script_info";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            self._create_metadata_script_info_table()
        #self.updater_list = self._reconcile_metadata_script_info_table()
        self.cursor.execute('show tables like "run_stats";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            self._create_run_stats_table()

        if not self.db_name.startswith('mv_'):
            raise ValueError('Supplied database ' + self.db_name + 'does not start with mv_  - exiting')
        self.cursor.execute('show databases like "' + self.db_name + '";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            raise ValueError("database: " + self.db_name + " does not exist - exiting")

    # __init__ helper methods
    def _create_run_stats_table(self):
        self.cursor.execute("""create table run_stats
        (
          run_start_time  datetime    null,
          run_finish_time datetime    null,
          database_name   varchar(50) null,
          status          varchar(30)
        ) comment 'keep track of matadata_upate stats - status one of started|waiting|succeeded|failed';""")
        self.cnx.commit()

    def _create_metadata_script_info_table(self):
        self.cursor.execute("""create table metadata_script_info
               (
                 app_reference          varchar(50)  null,
                 running                BOOLEAN        
               ) comment 'keep track of selective update metadata run status';""")
        self.cnx.commit()

    def _reconcile_metadata_script_info_table(self):
        updaterList = []
        # options are like {'cnf_file': cnf_file, 'db_model_input': db_model_input, 'metexpress_base_url': metexpress_base_url}
        options ={'cnf_file': self.cnf_file, 'db_model_input': "", 'metexpress_base_url': self.metexpress_base_url}
        for importer, modname, ispkg in pkgutil.iter_modules(metexpress.__path__):
            if modname.startswith('selective'):
                submod = importlib.import_module('metexpress' + '.' + modname)
                for updateClass in inspect.getmembers(submod, inspect.isclass):
                    if updateClass[0].startswith('Update'):
                        updater = getattr(submod, updateClass[0])(self.cnf_file)
                        appReference = updater.get_app_reference()
                        dtpl = updater.get_data_table_pattern_list()
                        updaterList.append(
                            {'app_reference': appReference, 'data_table_pattern_list': dtpl, 'updater': updater})
                        self.cursor.execute(
                            "select app_reference from metadata_script_info where app_reference = '" + appReference + "';")
                        self.cnx.commit()
                        if self.cursor.rowcount == 0:
                            self.cursor.execute("INSERT INTO metadata_script_info (app_reference, running) VALUES ('" + appReference + "', False );")
                            self.cnx.commit()
        self.updater_list = updaterList

    # instance methods
    def get_latest_run_finish_time(self):
        self.cursor.execute(
            "select distinct run_finish_time from run_stats where database_name = '" + self.db_name + "' and status = 'succeeded' order by run_finish_time desc limit 1;")
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            run_finish_time = str(datetime.utcfromtimestamp(0))
        else:
            run_finish_time = self.cursor.values()[0]
        return run_finish_time

    def get_models_for_database(self, data_table_pattern_list, last_run_finish_time):
        # db_models is a comma seperated list of db.model
        db_models = ""
        for dtple in data_table_pattern_list:
            cmd = "select distinct model  \
                  from " + self.db_name + ".stat_header  \
                  where stat_header_id in  \
                        (select stat_header_id from " + self.db_name + "." + dtple + " "\
                  "where data_file_id in  \
                      (select distinct data_file_id from " + self.db_name + ".data_file  \
                                        where load_date > '" + str(last_run_finish_time) + "') );"
            self.cursor.execute(cmd)
            self.cnx.commit()
            firstRow = True
            for row in self.cursor:
                model = row['model']
                if not model in db_models:
                    if not firstRow:
                        db_models += ","
                    db_models += self.db_name + "." + row['model']
                    if firstRow:
                        firstRow = False
        return db_models

    def update_status(self, status, utc_start, utc_end):
        db_name = self.db_name
        assert status == "started" or status == "waiting" or status == "succeeded" or status == "failed", "Attempt to update run_stats where status is not one of started | waiting | succeeded | failed: " + status
        self.cursor.execute("select database_name from run_stats where database_name = '" + db_name + "'")
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            # insert
            insert_cmd = 'INSERT INTO run_stats (run_start_time, run_finish_time, database_name, status) VALUES ("' + utc_start + '","' + utc_end + '","' + db_name + '", "' + status + '");'
            self.cursor.execute(insert_cmd)
            self.cnx.commit()
        else:
            # update
            qd = [utc_start, utc_end, status]
            update_cmd = 'update run_stats set run_start_time=%s, run_finish_time=%s, status=%s where database_name = "' + db_name + '";'
            self.cursor.execute(update_cmd, qd)
            self.cnx.commit()

    def update(self):
        utc_start = str(datetime.now())
        self.update_status("waiting", utc_start, str(datetime.now()))
        self.wait_on_other_updates(2 * 3600, 5)  # max three hours?
        self.update_status("started", utc_start, str(datetime.now()))
        print('MATS METADATA UPDATE FOR MET START: ' + utc_start)
        latest_run_finish_time = self.get_latest_run_finish_time()
        updateProcesses = []
        try:
            for elem in self.updater_list:
                data_table_pattern_list = elem['data_table_pattern_list']
                db_model_input = self.get_models_for_database(data_table_pattern_list, latest_run_finish_time)
                if len(db_model_input) > 0:
                    me_updater = elem['updater']
                    me_options = {'db_model_input': db_model_input,
                                 'metexpress_base_url': self.metexpress_base_url}
                    me_updater.update(me_options)
                    # p = Process(target=me_updater.update, args=(me_options,))
                    # updateProcesses.append(p)
                    # p.start()
        except Exception as ex:
            print ("Exception: " + str(ex ))
            traceback.print_stack()
            self.update_status("failed", utc_start, str(datetime.now()))
        # for up in updateProcesses:
        #     up.join()
        utc_end = str(datetime.now())
        print('MATS METADATA UPDATE FOR MET END: ' + utc_end)
        self.update_status("succeeded", utc_start, utc_end)

    # have to wait for other instantiations of selective updaters to finish before we can continue.
    def wait_on_other_updates(self, timeout, period=1):
        mustend = time.time() + timeout
        self.cursor.execute("select * from metadata_script_info")
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            return False
        while time.time() < mustend:
            # some sort of check for running updates
            self.cursor.execute("select app_reference from metadata_script_info where running != 0")
            self.cnx.commit()
            if self.cursor.rowcount > 0:
                waiting = True
                time.sleep(period)
            else:
                break;
        return False


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Error -- need three arguments: mysql_cnf_file mv_database_name, metexpress_base_url")
        sys.exit(1)
    cnf_file = sys.argv[1]
    mv_database_name = sys.argv[2]
    metexpress_base_url = sys.argv[3]
    metadataUpdater = metadatUpdate(cnf_file, mv_database_name, metexpress_base_url)
    metadataUpdater._reconcile_metadata_script_info_table()
    metadataUpdater.update()
    sys.exit(0)
