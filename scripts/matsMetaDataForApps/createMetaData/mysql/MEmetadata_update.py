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
import sys, os, importlib, inspect, pkgutil
import pymysql
import json
from datetime import datetime
import multiprocessing
import metexpress

from metexpress/selective_update_MEanomalycor.py import UpdateMEAnomalycor

class metadatUpdate:
    def __init__(self, cnf_file, db_name, metexpress_base_url):
        self.updater_list = []
        self.cnf_file = cnf_file
        self.db_name = db_name
        self.metexpress_base_url = metexpress_base_url
        if not os.path.isfile(cnf_file):
             raise ValueError(cnf file " + cnf_file + " is not a file - exiting")

        self.cnx = pymysql.connect(read_default_file=cnf_file)
        self.cnx.autocommit = True
        self.cursor = cnx.cursor(pymysql.cursors.DictCursor)
        self.cursor.execute('show databases like "mats_metadata";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            create_db_query = 'create database mats_metadata;'
            self.cursor.execute(create_db_query)
            self.cnx.commit()

        self.cursor.execute("use mats_metadata;")
        self.cnx.commit()

        # see if the metadata tables already exist
        print("Checking for metadata_script_info tables")
        self.cursor.execute('show tables like "metadata_script_info";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            self._create_metadata_script_info_table(self.cnx, self.cursor)
        self.updater_list = self._reconcile_metadata_script_info_table(self.cnx, self.cursor)
        self.cursor.execute('show tables like "run_stats";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
        self._create_run_stats_table(self.cnx, self.cursor)

        if not self.db_name.startswith( 'mv_' ):
            raise ValueError ('Supplied database ' + self.db_name + 'does not start with mv_  - exiting')
        self.cursor.execute('show databases like "' + self.db_name + '";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            raise ValueError(database: " + self.db_name + " does not exist - exiting")

    # __init__ helper methods
    def _create_run_stats_table (self, cnx, cursor):
        cursor.execute("""create table mats_metadata.run_stats
        (
          run_start_time  datetime    null,
          run_finish_time datetime    null,
          database_name   varchar(50) null,
          status          varchar(30)
        ) comment 'keep track of matadata_upate stats - status one of started|waiting|succeeded|failed';""")
        cnx.commit()

    def _create_metadata_script_info_table (self, cnx, cursor):
       cursor.execute("""create table metadata_script_info
               (
                 app_reference          varchar(50)  null,
                 running                BOOLEAN  False
               ) comment 'keep track of selective update metadata run status';""")
        cnx.commit()

    def _reconcile_metadata_script_info_table (self, cnx, cursor):
        updaterList = []
        for importer, modname, ispkg in pkgutil.iter_modules(metexpress.__path__):
        	if modname.startswith('selective'):
        		submod = importlib.import_module('metexpress' + '.' + modname)
        		for updateClass in inspect.getmembers(submod,inspect.isclass):
        			if updateClass[0].startswith('Update'):
        				updater = getattr(submod, updateClass[0])()
        				appReference = updater.get_app_reference()
        				dtpl = updater.get_data_table_pattern_list()
        				updaterList.append({'app_reference':appReference, 'data_table_pattern_list':dtpl, 'updater':updater})
                        cursor.execute("select app_reference from mats_metadata.metadata_script_info where app_reference = '" + app_reference + "';")
                        cnx.commit()
                        if cursor.rowcount == 0:
                            cursor.execute("INSERT INTO mats_metadata.metadata_script_info app_reference, running) VALUES (" + app_reference + ", False );")
                                cnx.commit()
        return updaterList

    # instance methods
    def get_latest_run_finish_time(self):
        cursor.execute("select distinct run_finish_time from mats_metadata.run_stats where database_name = '" + self.db_name + "' and status = 'succeeded' order by run_finish_time desc limit 1;")
        cnx.commit()
        if cursor.rowcount == 0:
           run_finish_time = 0
        else:
            run_finish_time = cursor.values()[0]
        return run_finish_time

    def get_models_for_database(self, data_table_pattern_list):
        # db_models is a comma seperated list of db.model
        db_models = ""
        for dtple in data_table_pattern_list:
            cmd = """select distinct model
                     from """ + self.db_name + """.stat_header
                     where stat_header_id in (select stat_header_id
                                              from """ + self.db_name + "." + dtple +
                                              """where data_file_id in (select distinct data_file_id
                                                                     from """ + self.db_name + """.data_file
                                                                     where load_date > '2018-11-13 13:02:00'));"""
            self.cursor.execute(cmd)
            self.cnx.commit()
            firstRow = True
            for row in cursor:
                model = row['model']
                if not model in db_models:
                    if not firstRow:
                        db_models += ","
                        firstRow = False
                    db_models += db_name + "." + row['model']
        return db_models

    def update_status(self, status, utc_start, utc_end):
        db_name = self.db_name
        assert staus == "started" | staus == "waiting" | staus == "succeeded" | staus == "failed", "Attempt to update run_stats where status is not one of started"|"waiting"|"succeeded"|"failed: " + status
        self.cursor.execute("select database_name from mats_metadata.run_stats where database_name = '" + db_name + "'")
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            #insert
            insert_cmd = 'INSERT INTO mats_metadata.run_stats (run_start_time, run_finish_time, database_name, status) VALUES ("' +
            '"' + utc_start  + '",' +
            '"' + utc_end  + '",' +
            '"' + db_name  + '",' +
            '"' + state  + '";'
            self.cursor.execute(insert_cmd)
            self.cnx.commit()
        else:
            #update
            qd = [utc_start,utc_end,state]
            update_cmd = 'update mats_metadata.metadata_script_info set state = "' + state + '" where app_reference = "' + self.get_app_reference() + '";'
            update_cmd = 'update mats_metadata.run_stats set run_start_time=%s, run_finish_time=%s, status=%s where database_name = "' + db_name + '";'
            self.cursor.execute(update_cmd, qd)
            self.cnx.commit()

    def update(self):
        refresh_urls = self.refresh_urls
        utc_start = str(datetime.now())
        self.update_status("waiting", utc_start)
        wait_on_other_updates(2 * 3600,5) # max three hours?
        self.update_status("started", utc_start, str(datetime.now())
        print('MATS METADATA UPDATE FOR MET START: ' + utc_start)
        run_finish_time = self.get_latest_run_finish_time()
        try:
            for elem in self.updaterList:
                data_table_pattern_list = elem.data_table_pattern_list
                db_model_input = self.get_models_for_database(data_table_pattern_list)
                if len(db_model_input) > 0:
                    me_updater = elem.updater
                    refresh_urls = self.build_refresh_url_list (self.metexpress_base_url)
                    me_options = {'cnf_file':self.cnf_file, 'db_model_input':db_model_input, 'refresh_urls':refresh_urls}
                    p = Process(target=me_updater.update, args=(me_options))
                    p.start()
                    p.join()
        except:
            self.update_status("failed", utc_start, str(datetime.now(), self.db_name)
        utc_end = str(datetime.now())
        print('MATS METADATA UPDATE FOR MET END: ' + utc_end)
        self.update_status("suceeded", utc_start, utc_end, self.db_name)

    # have to wait for other instantiations of selective updaters to finish before we can continue.
    def wait_on_other_updates(self, timeout, period=1):
        mustend = time.time() + timeout
        while time.time() < mustend:
            # some sort of check for running updates
            cursor.execute("select script_name from mats_metadata.metadata_script_info where running = True")
            cnx.commit()
            if cursor.rowcount > 0:
                waiting = True
                time.sleep(period)
        return False

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Error -- need two arguments: mysql_cnf_file and mv_database_name")
        sys.exit(1)
    cnf_file = sys.argv[1]
    mv_database_name = sys.argv[2]
    metexpress_base_url = sys.argv[3].split(',')
    metadataUpdater = metadatUpdate(cnf_file, mv_database_name, metexpress_base_url)
    metadataUpdater.update()
    sys.exit(0)
