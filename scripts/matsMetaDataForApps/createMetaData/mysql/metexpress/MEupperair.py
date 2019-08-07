#!/usr/bin/env python
"""
This script creates the metadata tables required for a METexpress upper air app. It parses the required fields from any
databases that begin with 'mv_' in a mysql instance.

Arguments: path to a mysql .cnf file

Usage: ./MEupperair.py path_to_file.cnf

Author: Molly B Smith
"""

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.

from __future__ import print_function

import json
import os.path
import sys
import traceback
from datetime import datetime

import pymysql


class MEUpperair:
    def mysql_prep_tables(self):
        try:
            self.cnx = pymysql.connect(read_default_file=self.cnf_file,
                                       cursorclass=pymysql.cursors.DictCursor)
            self.cnx.autocommit = True
            self.cursor = self.cnx.cursor()
            self.cursor = self.cnx.cursor(pymysql.cursors.DictCursor)
            self.cursor.execute('set group_concat_max_len=4294967295;')

        except pymysql.Error as e:
            print("MEupper air - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)

        # see if the metadata database already exists
        print("MEupper air - Checking for " + self.metadata_database)
        self.cursor.execute('show databases like "' + self.metadata_database + '";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            create_db_query = 'create database ' + self.metadata_database + ';'
            self.cursor.execute(create_db_query)
            self.cnx.commit()

        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()

        # see if the metadata tables already exist
        print("MEupper air - Checking for upperair metadata tables")
        self.cursor.execute('show tables like "upperair_mats_metadata_dev";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            print("MEupper air - Metadata dev table does not exist--creating it")
            create_table_query = 'create table upperair_mats_metadata_dev (db varchar(255), model varchar(255), display_text varchar(255), regions varchar(1023), levels varchar(1023), fcst_lens varchar(1023), variables varchar(1023), fcst_orig varchar(1023), mindate int(11), maxdate int(11), numrecs int(11), updated int(11));'
            self.cursor.execute(create_table_query)
            self.cnx.commit()
        self.cursor.execute('show tables like "upperair_mats_metadata";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            print("MEupper air - Metadata prod table does not exist--creating it")
            create_table_query = 'create table upperair_mats_metadata like upperair_mats_metadata_dev;'
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        print("MEupper air - Deleting from metadata dev table")
        self.cursor.execute("delete from upperair_mats_metadata_dev;")
        self.cnx.commit()

        # see if the metadata group tables already exist
        self.cursor.execute('show tables like "upperair_database_groups_dev";')
        if self.cursor.rowcount == 0:
            print("MEupper air - Database group dev table does not exist--creating it")
            create_table_query = 'create table upperair_database_groups_dev (db_group varchar(255), dbs varchar(32767));'
            self.cursor.execute(create_table_query)
            self.cnx.commit()
        self.cursor.execute('show tables like "upperair_database_groups";')
        if self.cursor.rowcount == 0:
            print("MEupper air - Database group prod table does not exist--creating it")
            create_table_query = 'create table upperair_database_groups like upperair_database_groups_dev;'
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        print("MEupper air - Deleting from group dev table")
        self.cursor.execute("delete from upperair_database_groups_dev;")
        self.cnx.commit()

    def deploy_dev_table_and_close_cnx(self):
        print("MEupper air - Publishing metadata")
        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()
        self.cursor.execute("delete from upperair_mats_metadata;")
        self.cnx.commit()
        self.cursor.execute("insert into upperair_mats_metadata select * from upperair_mats_metadata_dev;")
        self.cnx.commit()
        self.cursor.execute("delete from upperair_database_groups;")
        self.cnx.commit()
        self.cursor.execute("insert into upperair_database_groups select * from upperair_database_groups_dev;")
        self.cnx.commit()

        self.cursor.close()
        self.cnx.close()

    def strip_level(self, elem):
        # helper function for sorting levels
        if '-' not in elem:
            return int(elem[1:])
        else:
            hyphen_idx = elem.find('-')
            return int(elem[1:hyphen_idx])

    def build_stats_object(self):
        print("MEupper air - Compiling metadata")
        # Open two additional connections to the database
        try:
            cnx2 = pymysql.connect(read_default_file=self.cnf_file)
            cnx2.autocommit = True
            cursor2 = cnx2.cursor(pymysql.cursors.DictCursor)
            cursor2.execute('set group_concat_max_len=4294967295;')
            cnx2.commit()
        except pymysql.Error as e:
            print("MEupper air - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)
        try:
            cnx3 = pymysql.connect(read_default_file=self.cnf_file)
            cnx3.autocommit = True
            cursor3 = cnx3.cursor(pymysql.cursors.DictCursor)
            cursor3.execute('set group_concat_max_len=4294967295;')
            cnx3.commit()
        except pymysql.Error as e:
            print("MEupper air - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)

        # Get list of databases here
        show_mvdbs = 'show databases like "mv_%";'
        self.cursor.execute(show_mvdbs)
        self.cnx.commit()
        mvdbs = []
        rows = self.cursor.fetchall()
        for row in rows:
            mvdbs.append(list(row.values())[0])
        # Find the metadata for each database
        per_mvdb = {}
        db_groups = {}
        for mvdb in mvdbs:
            per_mvdb[mvdb] = {}
            db_has_valid_data = False
            use_db = "use " + mvdb
            self.cursor.execute(use_db)
            self.cnx.commit()
            cursor2.execute(use_db)
            cnx2.commit()
            print("\n\nMEupper air - Using db " + mvdb)

            # Get the models in this database
            get_models = 'select distinct model from stat_header where fcst_lev like "P%";'
            self.cursor.execute(get_models)
            self.cnx.commit()
            for line in self.cursor:
                model = list(line.values())[0]
                per_mvdb[mvdb][model] = {}
                print("\nMEupper air - Processing model " + model)

                # Get the regions for this model in this database
                get_regions = 'select distinct vx_mask from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                per_mvdb[mvdb][model]['regions'] = []
                print("MEupper air - Getting regions for model " + model)
                cursor2.execute(get_regions)
                cnx2.commit()
                for line2 in cursor2:
                    region = list(line2.values())[0]
                    per_mvdb[mvdb][model]['regions'].append(region)
                per_mvdb[mvdb][model]['regions'].sort()

                # Get the levels for this model in this database
                get_levels = 'select distinct fcst_lev from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                per_mvdb[mvdb][model]['levels'] = []
                print("MEupper air - Getting levels for model " + model)
                cursor2.execute(get_levels)
                cnx2.commit()
                for line2 in cursor2:
                    level = list(line2.values())[0]
                    per_mvdb[mvdb][model]['levels'].append(level)
                per_mvdb[mvdb][model]['levels'].sort(key=self.strip_level)

                # Get the UA variables for this model in this database
                get_vars = 'select distinct fcst_var from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                per_mvdb[mvdb][model]['variables'] = []
                print("MEupper air - Getting variables for model " + model)
                cursor2.execute(get_vars)
                cnx2.commit()
                for line2 in cursor2:
                    variable = list(line2.values())[0]
                    per_mvdb[mvdb][model]['variables'].append(variable)
                per_mvdb[mvdb][model]['variables'].sort()

                print("MEupper air - Getting fcst lens for model " + model)
                temp_fcsts = set()
                temp_fcsts_orig = set()

                # Get the fcst lead times for this model in this database (select from the first and last 500000 rows in the line_data table)
                # We only select from the first and last 500000 rows because some of these tables can have millions and millions of rows
                # resulting in extremely long query times
                # and the first and last 500000 entries should get a good sampling of metadata.
                # a complete query can be done out of band
                get_stat_header_ids = "select group_concat(stat_header_id) as stat_header_list from stat_header where model='" + model + "' and fcst_lev like 'P%';"
                cursor2.execute(get_stat_header_ids)
                cnx2.commit()
                stat_header_id_list = cursor2.fetchone()['stat_header_list']
                per_mvdb[mvdb][model]['fcsts'] = []
                per_mvdb[mvdb][model]['fcst_orig'] = []
                if stat_header_id_list is not None:
                    get_fcsts_early = "select distinct fcst_lead from \
                    (select fcst_lead, stat_header_id from line_data_sl1l2 order by stat_header_id limit 500000) s \
                                where stat_header_id in (" + stat_header_id_list + ");"
                    cursor2.execute(get_fcsts_early)
                    cnx2.commit()
                    for line2 in cursor2:
                        fcst = int(list(line2.values())[0])
                        temp_fcsts_orig.add(fcst)
                        if fcst % 10000 == 0:
                            fcst = int(fcst / 10000)
                        temp_fcsts.add(fcst)

                    get_fcsts_late = "select distinct fcst_lead from \
                    (select fcst_lead, stat_header_id from line_data_sl1l2 order by stat_header_id desc limit 500000) s \
                                where stat_header_id in (" + stat_header_id_list + ");"
                    cursor2.execute(get_fcsts_late)
                    cnx2.commit()
                    for line2 in cursor2:
                        fcst = int(list(line2.values())[0])
                        temp_fcsts_orig.add(fcst)
                        if fcst % 10000 == 0:
                            fcst = int(fcst / 10000)
                        temp_fcsts.add(fcst)

                    per_mvdb[mvdb][model]['fcsts'] = list(map(str,sorted(temp_fcsts)))
                    per_mvdb[mvdb][model]['fcst_orig'] = list(map(str,sorted(temp_fcsts_orig)))

                print("MEupper air - Getting stats for model " + model)
                get_stats_earliest = 'select min(fcst_valid_beg) as mindate, max(fcst_valid_beg) as maxdate from (select fcst_valid_beg,stat_header_id from line_data_sl1l2 order by stat_header_id limit 500000) s where stat_header_id in (' + stat_header_id_list + ');'
                get_stats_latest = 'select min(fcst_valid_beg) as mindate, max(fcst_valid_beg) as maxdate from (select fcst_valid_beg,stat_header_id from line_data_sl1l2 order by stat_header_id desc limit 500000) s where stat_header_id in (' + stat_header_id_list + ');'
                get_num_recs = 'select count(fcst_valid_beg) as numrecs from line_data_sl1l2;'
                cursor2.execute(get_stats_earliest)
                cnx2.commit()
                data = cursor2.fetchone()
                min_earliest = data['mindate']
                max_earliest = data['maxdate']
                cursor2.execute(get_stats_latest)
                cnx2.commit()
                data = cursor2.fetchone()
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
                cursor2.execute(get_num_recs)
                cnx2.commit()
                data = cursor2.fetchone()
                if data is None:
                    num_recs = 0
                else:
                    num_recs = data['numrecs']
                per_mvdb[mvdb][model]['numrecs'] = num_recs
                if int(per_mvdb[mvdb][model]['numrecs']) > int(0):
                    db_has_valid_data = True
                    print("\nMEupper air - Storing metadata for model " + model)
                    self.add_model_to_metadata_table(cnx3, cursor3, mvdb, model, per_mvdb[mvdb][model])
                else:
                    print("\nMEupper air - No valid metadata for model " + model)

            # Get the group(s) this db is in
            if db_has_valid_data:
                get_groups = 'select category from metadata'
                self.cursor.execute(get_groups)
                if self.cursor.rowcount > 0:
                    for line in self.cursor:
                        group = list(line.values())[0]
                        if group in db_groups:
                            db_groups[group].append(mvdb)
                        else:
                            db_groups[group] = [mvdb]
                else:
                    group = "NO GROUP"
                    if group in db_groups:
                        db_groups[group].append(mvdb)
                    else:
                        db_groups[group] = [mvdb]

        # save db group information
        print(db_groups)
        self.populate_db_group_tables(db_groups)

        # Print full metadata object
        print(json.dumps(per_mvdb, sort_keys=True, indent=4))

        try:
            cursor2.close()
            cnx2.close()
        except pymysql.Error as e:
            print("MEupper air - Error closing 2nd cursor: " + str(e))
            traceback.print_stack()
        try:
            cursor3.close()
            cnx3.close()
        except pymysql.Error as e:
            print("MEupper air - Error closing 3rd cursor: " + str(e))
            traceback.print_stack()

    def add_model_to_metadata_table(self, cnx_tmp, cursor_tmp, mvdb, model, raw_metadata):
        # Add a row for each model/db combo
        cursor_tmp.execute("use  " + self.metadata_database + ";")
        cnx_tmp.commit()

        if len(raw_metadata['regions']) > int(0) and len(raw_metadata['levels']) and len(raw_metadata['fcsts']) and len(
                raw_metadata['variables']) > int(0):
            qd = []
            updated_utc = datetime.utcnow().strftime('%s')
            mindate = raw_metadata['mindate']
            maxdate = raw_metadata['maxdate']
            display_text = model.replace('.', '_')
            insert_row = "insert into upperair_mats_metadata_dev (db, model, display_text, regions, levels, fcst_lens, variables, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            qd.append(mvdb)
            qd.append(model)
            qd.append(display_text)
            qd.append(str(raw_metadata['regions']))
            qd.append(str(raw_metadata['levels']))
            qd.append(str(raw_metadata['fcsts']))
            qd.append(str(raw_metadata['variables']))
            qd.append(str(raw_metadata['fcst_orig']))
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(raw_metadata['numrecs'])
            qd.append(updated_utc)
            cursor_tmp.execute(insert_row, qd)
            cnx_tmp.commit()

    def populate_db_group_tables(self, db_groups):
        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()
        for group in db_groups:
            qd = []
            insert_row = "insert into upperair_database_groups_dev (db_group, dbs) values(%s, %s)"
            qd.append(group)
            qd.append(str(db_groups[group]))
            self.cursor.execute(insert_row, qd)
            self.cnx.commit()

    def main(self, cnf_file, db_name):
        self.metadata_database = db_name
        self.cnf_file = cnf_file
        self.mysql_prep_tables()
        self.build_stats_object()
        self.deploy_dev_table_and_close_cnx()


if __name__ == '__main__':
    metadataDatabaseName = "mats_metadata"
    if len(sys.argv) < 2:
        print("MEupper air - Error -- mysql cnf file needs to be passed in as argument")
        sys.exit(1)
    elif len(sys.argv) == 2:
        cnf_file = sys.argv[1]
        exists = os.path.isfile(cnf_file)
        if exists:
            print(" MEupper air - using cnf file: " + cnf_file)
        else:
            print("MEupper air - cnf file " + cnf_file + " is not a file - exiting")
            sys.exit(1)
    elif len(sys.argv) == 3:
        cnf_file = sys.argv[1]
        exists = os.path.isfile(cnf_file)
        if exists:
            print(" MEupper air - using cnf file: " + cnf_file)
        else:
            print("MEupper air - cnf file " + cnf_file + " is not a file - exiting")
            sys.exit(1)
        metadataDatabaseName = sys.argv[2]
        print(" MEupper air - using matadata database: " + metadataDatabaseName)
        utc_now = str(datetime.now())
    msg = 'UPPER AIR MATS FOR MET METADATA START: ' + utc_now
    print(msg)
    me_dbcreator = MEUpperair()
    me_dbcreator.main(cnf_file, metadataDatabaseName)
    utc_now = str(datetime.now())
    msg = 'UPPER AIR MATS FOR MET METADATA END: ' + utc_now
    print(msg)
    sys.exit(0)
