#!/usr/bin/env python
"""
This script updates specified db/model combinations in the metadata tables required for a METexpress airquality app.
It parses the required fields from any databases that begin with 'mv_' in a mysql instance.

Arguments: path to a mysql .cnf file, comma-separated list of db.model pairs to update

Usage: ./selective_update_MEairquality.py path_to_file.cnf db1.model1,db2.model2,...

Author: Molly B Smith
"""

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.

from __future__ import print_function

import getopt
import sys
import traceback
import urllib.request
from datetime import datetime

import pymysql

import metexpress.MEairquality as MEairquality


class UpdateMEAirquality:
    def __init__(self, cnf_file, metadata_database):
        self.metadata_database = metadata_database
        self.cnf_file = cnf_file
        self.cnx = pymysql.connect(read_default_file=self.cnf_file)
        self.cnx.autocommit = True
        self.cursor = self.cnx.cursor(pymysql.cursors.DictCursor)
        self.cursor.execute('set group_concat_max_len=4294967295;')
        self.cnx.commit
        self.cnx2 = pymysql.connect(read_default_file=self.cnf_file)
        self.cnx2.autocommit = True
        self.cursor2 = self.cnx2.cursor(pymysql.cursors.DictCursor)
        self.cursor2.execute('set group_concat_max_len=4294967295;')
        self.cnx2.commit

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

    def get_app_reference(self):
        return "met-airquality"

    def get_data_table_pattern_list(self):
        return ['line_data_sl1l2']

    def update_tables_and_close_cnx(self):
        print("selective_MEairquality - Publishing metadata")
        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()
        self.cursor.execute("delete from airquality_mats_metadata;")
        self.cnx.commit()
        self.cursor.execute("insert into airquality_mats_metadata select * from airquality_mats_metadata_dev;")
        self.cnx.commit()
        self.cursor.execute("delete from airquality_database_groups;")
        self.cnx.commit()
        self.cursor.execute("insert into airquality_database_groups select * from airquality_database_groups_dev;")
        self.cnx.commit()
        self.cursor.close()
        self.cnx.close()
        self.cursor2.close()
        self.cnx2.close()

    def strip_level(self, elem):
        # helper function for sorting levels
        if elem[0] in ['Z', 'H', 'L']:
            return int(elem[1:])
        else:
            return 0

    def strip_trsh(self, elem):
        # helper function for sorting thresholds
        if elem[0] == '>' or elem[0] == '<':
            return float(elem[1:])
        else:
            return 0

    def build_stats_object(self):
        # parse dbs and models to reprocess
        mvdbs = []
        mvdb_map = {}
        db_model_pairs = self.db_model_input.strip().split(',')
        for db_model_pair in db_model_pairs:
            split_pair = db_model_pair.split('.')
            if split_pair[0] not in mvdb_map.keys():
                mvdbs.append(split_pair[0])
                mvdb_map[split_pair[0]] = [split_pair[1]]
            else:
                mvdb_map[split_pair[0]].append(split_pair[1])

        per_mvdb = {}
        db_groups = {}
        for mvdb in mvdbs:
            per_mvdb[mvdb] = {}
            use_db = "use " + mvdb
            self.cursor.execute(use_db)
            self.cnx.commit()
            print("\n\nselective_MEairquality - Using db " + mvdb)

            # Update models in this database
            for model in mvdb_map[mvdb]:
                per_mvdb[mvdb][model] = {}
                print("\nselective_MEairquality - Processing model " + model)
                print("selective_MEairquality - Getting stats for model " + model)

                get_stats_earliest = 'select min(fcst_valid_beg) as mindate, max(fcst_valid_beg) as maxdate from (select fcst_valid_beg,stat_header_id from line_data_sl1l2 order by stat_header_id limit 500000) s where stat_header_id in (select stat_header_id from stat_header where model="' + model + '" \
                    and fcst_var regexp "^OZ|^PM25");'
                get_stats_latest = 'select min(fcst_valid_beg) as mindate, max(fcst_valid_beg) as maxdate from (select fcst_valid_beg,stat_header_id from line_data_sl1l2 order by stat_header_id desc limit 500000) s where stat_header_id in (select stat_header_id from stat_header where model="' + model + '" \
                    and fcst_var regexp "^OZ|^PM25");'
                get_num_recs = 'select count(fcst_valid_beg) as numrecs from line_data_sl1l2;'
                self.cursor.execute(get_stats_earliest)
                self.cnx.commit()
                data = self.cursor.fetchone()
                min_earliest = data['mindate']
                max_earliest = data['maxdate']
                self.cursor.execute(get_stats_latest)
                self.cnx.commit()
                data = self.cursor.fetchone()
                min_latest = data['mindate']
                max_latest = data['maxdate']
                if min_earliest is not None and min_latest is not None:
                    min_val = min_earliest if min_earliest < min_latest else min_latest
                elif min_earliest is not None and min_latest == None:
                    min_val = min_earliest
                elif min_earliest == None and min_latest is not None:
                    min_val = min_latest
                else:
                    # both are None so choose the initial epoch
                    min_val = datetime.fromtimestamp(0)
                if max_earliest is not None and max_latest is not None:
                    max_val = max_earliest if max_earliest < max_latest else max_latest
                elif max_earliest is not None and max_latest == None:
                    max_val = max_earliest
                elif max_earliest == None and max_latest is not None:
                    max_val = max_latest
                else:
                    # both are None so choose the current time
                    max_val = datetime.now()

                per_mvdb[mvdb][model]['mindate'] = int(min_val.timestamp())
                per_mvdb[mvdb][model]['maxdate'] = int(max_val.timestamp())
                self.cursor.execute(get_num_recs)
                self.cnx.commit()
                data = self.cursor.fetchone()
                num_recs = data['numrecs']
                per_mvdb[mvdb][model]['numrecs'] = num_recs

                # Get the rest of the metadata only if data actually exists
                if int(per_mvdb[mvdb][model]['numrecs']) > int(0):
                    # Get the regions for this model in this database
                    get_regions = 'select distinct vx_mask from stat_header where fcst_var regexp "^OZ|^PM25" and model ="' + model + '";'
                    per_mvdb[mvdb][model]['regions'] = []
                    print("selective_MEairquality - Getting regions for model " + model)
                    self.cursor.execute(get_regions)
                    self.cnx.commit()
                    for line2 in self.cursor:
                        region = list(line2.values())[0]
                        per_mvdb[mvdb][model]['regions'].append(region)
                    per_mvdb[mvdb][model]['regions'].sort()

                    # Get the levels for this model in this database
                    get_levels = 'select distinct fcst_lev from stat_header where fcst_var regexp "^OZ|^PM25" and model ="' + model + '";'
                    per_mvdb[mvdb][model]['levels'] = []
                    print("selective_MEairquality - Getting levels for model " + model)
                    self.cursor.execute(get_levels)
                    self.cnx.commit()
                    for line2 in self.cursor:
                        level = list(line2.values())[0]
                        per_mvdb[mvdb][model]['levels'].append(level)
                    per_mvdb[mvdb][model]['levels'].sort(key=self.strip_level)

                    # Get the thresholds for this model in this database
                    get_trshs = 'select distinct fcst_thresh from stat_header where fcst_var regexp "^OZ|^PM25" and model ="' + model + '";'
                    per_mvdb[mvdb][model]['trshs'] = []
                    print(" MEairquality - Getting thresholds for model " + model)
                    self.cursor.execute(get_trshs)
                    self.cnx.commit()
                    for line2 in self.cursor:
                        trsh = str(list(line2.values())[0])
                        per_mvdb[mvdb][model]['trshs'].append(trsh)
                    per_mvdb[mvdb][model]['trshs'].sort(key=self.strip_trsh)

                    # Get the variables for this model in this database
                    get_vars = 'select distinct fcst_var from stat_header where fcst_var regexp "^OZ|^PM25" and model ="' + model + '";'
                    per_mvdb[mvdb][model]['variables'] = []
                    print("selective_MEairquality - Getting variables for model " + model)
                    self.cursor.execute(get_vars)
                    self.cnx.commit()
                    for line2 in self.cursor:
                        variable = list(line2.values())[0]
                        per_mvdb[mvdb][model]['variables'].append(variable)
                    per_mvdb[mvdb][model]['variables'].sort()

                    print("selective_MEupperair air - Getting fcst lens for model " + model)

                    temp_fcsts = set()
                    temp_fcsts_orig = set()
                    # Get the fcst lead times for this model in this database (select from the first and last 500000 rows in the line_data table)
                    # We only select from the first and last 500000 rows because some of these tables can have millions and millions of rows
                    # resulting in extremely long query times
                    # and the first and last 500000 entries should get a good sampling of metadata.
                    # a complete query can be done out of band
                    get_stat_header_ids = "select group_concat(stat_header_id) as stat_header_list from stat_header where model='" + model + "' and fcst_var regexp '^OZ|^PM25';"
                    self.cursor.execute(get_stat_header_ids)
                    self.cnx.commit()
                    stat_header_id_list = self.cursor.fetchone()['stat_header_list']
                    per_mvdb[mvdb][model]['fcsts'] = []
                    per_mvdb[mvdb][model]['fcst_orig'] = []
                    if stat_header_id_list is not None:
                        get_fcsts_early = "select distinct fcst_lead from \
                                        (select fcst_lead, stat_header_id from line_data_sl1l2 order by stat_header_id limit 500000) s \
                                                    where stat_header_id in (" + stat_header_id_list + ");"
                        self.cursor.execute(get_fcsts_early)
                        self.cnx.commit()
                        for line2 in self.cursor:
                            fcst = int(list(line2.values())[0])
                            temp_fcsts_orig.add(fcst)
                            if fcst % 10000 == 0:
                                fcst = int(fcst / 10000)
                            temp_fcsts.add(fcst)

                        get_fcsts_late = "select distinct fcst_lead from \
                                        (select fcst_lead, stat_header_id from line_data_sl1l2 order by stat_header_id desc limit 500000) s \
                                                    where stat_header_id in (" + stat_header_id_list + ");"
                        self.cursor.execute(get_fcsts_late)
                        self.cnx.commit()
                        for line2 in self.cursor:
                            fcst = int(list(line2.values())[0])
                            temp_fcsts_orig.add(fcst)
                            if fcst % 10000 == 0:
                                fcst = int(fcst / 10000)
                            temp_fcsts.add(fcst)
                        per_mvdb[mvdb][model]['fcsts'] = list(map(str,sorted(temp_fcsts)))
                        per_mvdb[mvdb][model]['fcst_orig'] = list(map(str,sorted(temp_fcsts_orig)))
                        print("\nselective_MEairquality - Storing metadata for model " + model)
                        self.update_model_in_metadata_table(mvdb, model, per_mvdb[mvdb][model])
                else:
                    print("\nselective_MEairquality - No valid metadata for model " + model)

            self.update_groups(mvdb)

        # Print full metadata object
        # print(json.dumps(per_mvdb, sort_keys=True, indent=4))

    def update_model_in_metadata_table(self, mvdb, model, raw_metadata):
        # Make sure there's a row for each model/db combo
        self.cursor2.execute("use  " + self.metadata_database + ";")
        self.cnx2.commit()

        # See if the db/model have previous metadata
        self.cursor2.execute(
            "select * from airquality_mats_metadata where db = '" + mvdb + "' and model = '" + model + "';")

        if len(raw_metadata['regions']) > int(0) and len(raw_metadata['levels']) and len(raw_metadata['fcsts']) and len(
                raw_metadata['variables']) > int(0):
            qd = []
            updated_utc = datetime.utcnow().strftime('%s')
            mindate = raw_metadata['mindate']
            maxdate = raw_metadata['maxdate']
            display_text = model.replace('.', '_')
            if self.cursor2.rowcount == 0:
                update_statement = "insert into airquality_mats_metadata_dev (db, model, display_text, regions, levels, fcst_lens, variables, trshs, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
                qd.append(mvdb)
                qd.append(model)
                qd.append(display_text)
            else:
                update_statement = "update airquality_mats_metadata_dev set regions = %s, levels = %s, fcst_lens = %s, variables = %s, trshs = %s, fcst_orig = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s where db = '" + mvdb + "' and model = '" + model + "';"
            qd.append(str(raw_metadata['regions']))
            qd.append(str(raw_metadata['levels']))
            qd.append(str(raw_metadata['fcsts']))
            qd.append(str(raw_metadata['variables']))
            qd.append(str(raw_metadata['trshs']))
            qd.append(str(raw_metadata['fcst_orig']))
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(raw_metadata['numrecs'])
            qd.append(updated_utc)
            self.cursor2.execute(update_statement, qd)
            self.cnx2.commit()

    def update_groups(self, mvdb):
        # get mvdb group
        get_group = 'select category from metadata'
        self.cursor.execute(get_group)
        if self.cursor.rowcount > 0:
            for row in self.cursor:
                group = list(row.values())[0]
        else:
            group = "NO GROUP"

        # see if this mvdb is already in this group. If not, add it.
        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()
        get_current_dbs_in_group = "select dbs from airquality_database_groups_dev where db_group = '" + group + "';"
        self.cursor.execute(get_current_dbs_in_group)
        if self.cursor.rowcount > 0:
            update_needed = True
            for row in self.cursor:
                current_dbs = list(row.values())[0].strip('[]')
                current_dbs = [x.replace(" ", "").strip("'") for x in current_dbs.split(',')]
                if mvdb not in current_dbs:
                    current_dbs.append(mvdb)
        else:
            update_needed = False
            current_dbs = [mvdb]

        # store the new group info
        if update_needed:
            update_group = 'update airquality_database_groups_dev set dbs = "' + str(
                current_dbs) + '" where db_group = "' + group + '";'
            self.cursor.execute(update_group)
            self.cnx.commit()
        else:
            insert_group = 'insert into airquality_database_groups_dev (db_group, dbs) values("' + str(
                group) + '", "' + str(current_dbs) + '");'
            self.cursor.execute(insert_group)
            self.cnx.commit()

    def set_running(self, state):
        # use its own cursor because the cursor may have been closed
        runningCnx = pymysql.connect(read_default_file=self.cnf_file)
        runningCnx.autocommit = True
        runningCursor = runningCnx.cursor(pymysql.cursors.DictCursor)
        runningCursor.execute("use  " + self.metadata_database + ";")
        runningCnx.commit()

        runningCursor.execute(
            "select app_reference from metadata_script_info where app_reference = '" + self.get_app_reference() + "'")
        runningCnx.commit()
        if runningCursor.rowcount == 0:
            # insert
            insert_cmd = 'insert into metadata_script_info (app_reference,  running) values ("' + self.get_app_reference() + '", "' + str(
                int(state)) + '");'
            runningCursor.execute(insert_cmd)
            runningCnx.commit()
        else:
            # update
            update_cmd = 'update metadata_script_info set running = "' + str(
                int(state)) + '" where app_reference = "' + self.get_app_reference() + '";'
            runningCursor.execute(update_cmd)
            runningCnx.commit()
        runningCursor.close
        runningCnx.close()

    def update(self, options):
        try:
            self.cursor.execute('show databases like "' + self.metadata_database + '";')
            self.cnx.commit()
            if self.cursor.rowcount == 0:
                self.cursor.execute('create database ' + self.metadata_database + ';')
                self.cnx.commit()
            self.cursor.execute("use  " + self.metadata_database + ";")
            self.cnx.commit()

            # see if the metadata tables already exist
            print("Checking for metadata_script_info tables")
            self.cursor.execute('show tables like "metadata_script_info";')
            self.cnx.commit()
            if self.cursor.rowcount == 0:
                self._create_metadata_script_info_table()
            self.cursor.execute('show tables like "run_stats";')
            self.cnx.commit()
            if self.cursor.rowcount == 0:
                self._create_run_stats_table()

            self.db_model_input = options['db_model_input']
            self.refresh_url = options['metexpress_base_url'] + "/" + self.get_app_reference() + "/refreshMetadata"
            utc_now = str(datetime.now())
            print('AIRQUALITY MATS FOR MET UPDATE METADATA START: ' + utc_now)
            # see if the metadata database already exists
            needsUpdate = False

            # see if the metadata tables already exist
            self.cursor.execute('show tables like "airquality_mats_metadata_dev";')
            self.cnx.commit()
            if self.cursor.rowcount == 0:
                needsUpdate = True

            self.cursor.execute('show tables like "airquality_mats_metadata";')
            self.cnx.commit()
            if self.cursor.rowcount == 0:
                needsUpdate = True

            # see if the metadata group tables already exist
            self.cursor.execute('show tables like "airquality_database_groups_dev";')
            if self.cursor.rowcount == 0:
                needsUpdate = True

            self.cursor.execute('show tables like "airquality_database_groups";')
            if self.cursor.rowcount == 0:
                needsUpdate = True

            if needsUpdate:
                me = MEairquality.MEAirquality()
                me.main(self.cnf_file, self.metadata_database)
            self.set_running(True)
            self.build_stats_object()
            self.update_tables_and_close_cnx()
            urllib.request.urlopen(self.refresh_url, data=None, cafile=None, capath=None, cadefault=False, context=None)
            utc_now = str(datetime.now())
        finally:
            print('AIRQUALITY MATS FOR MET UPDATE METADATA END: ' + utc_now)
            self.set_running(False)

    # makes sure all expected options were indeed passed in
    @classmethod
    def validate_options(self, options):
        assert True, options['cnf_file'] is not None and options['db_model_input'] is not None and options[
            'metexpress_base_url'] is not None and options['metadata_database'] is not None

    # process 'c' style options - using getopt - usage describes options
    # options like {'cnf_file':cnf_file, 'db_model_input':db_model_input, 'metexpress_base_url':metexpress_base_url}
    # cnf_file - mysql cnf file, db_model_input - comma-separated list of db/model pairs, metexpress_base_url - metexpress address
    # The db_model_input might be initially an empty string and then set later when calling update. This
    # allows for instantiating the class before the db_model_inputs are known.
    # (m)ats_metadata_database_name] allows to override the default metadata databasename (mats_metadata) with something
    @classmethod
    def get_options(self, args):
        usage = ["(c)nf_file=", "(d)=b_model_input", "(u)=metexpress_base_url", "[(m)ats_metadata_database_name]"]
        cnf_file = None
        db_model_input = None
        refresh_urls = None
        metadata_database = "mats_metadata"
        try:
            opts, args = getopt.getopt(args[1:], "c:d:u:m:", usage)
        except getopt.GetoptError as err:
            # print help information and exit:
            print(str(err))  # will print something like "option -a not recognized"
            print(usage)  # print usage from last param to getopt
            traceback.print_stack()
            sys.exit(2)
        for o, a in opts:
            if o == "-?":
                print(usage)
                sys.exit(2)
            if o == "-c":
                cnf_file = a
            elif o == "-d":
                db_model_input = a
            elif o == "-u":
                metexpress_base_url = a
            elif o == "-m":
                metadata_database = a
            else:
                assert False, "unhandled option"
        # make sure none were left out...
        assert True, cnf_file is not None and db_model_input is not None and refresh_urls is not None
        options = {'cnf_file': cnf_file, 'db_model_input': db_model_input, 'metexpress_base_url': metexpress_base_url,
                   "metadata_database": metadata_database}
        UpdateMEAirquality.validate_options(options)
        return options


if __name__ == '__main__':
    options = UpdateMEAirquality.get_options(sys.argv)
    updater = UpdateMEAirquality(options['cnf_file'], options['metadata_database'])
    ret = updater.update(options)  # update needs other options i.e. db_model_input and metexpress_base_url
    sys.exit(ret)
