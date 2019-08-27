#!/usr/bin/env python3
"""
This script creates the metadata tables required for a METexpress anomaly correlation app. It parses the required fields from any
databases that begin with 'mv_' in a mysql instance.

Arguments: path to a mysql .cnf file

Usage: ./MEanomalycor.py path_to_file.cnf

Author: Molly B Smith
"""

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.

from __future__ import print_function

import ast
import getopt
import json
import os
import ssl
import sys
import time as tm
import traceback
import urllib.request
from datetime import datetime, timedelta, timezone

import pymysql


class MEAnomalycor:
    def __init__(self):
        self.script_name = os.path.basename(sys.argv[0]).replace('.py', '')
        self.line_data_table = "line_data_sal1l2"
        self.metadata_table = "anomalycor_mats_metadata"
        self.app_reference = "met-anomalycor"
        self.string_fields = ["regions", "levels", "fcst_lens", "variables", "fcst_orig"]
        self.int_fields = ["mindate", "maxdate", "numrecs", "updated"]
        self.database_groups = "anomalycor_database_groups"
        self.data_table_stat_header_id_limit = 10000000000  # default value - might be overridden by options
        self.dbs_too_large = {}

    def _create_run_stats_table(self):
        self.cursor.execute("""create table run_stats
        (
          script_name   varchar(50) null,
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

    def update_status(self, status, utc_start, utc_end):
        assert status == "started" or status == "waiting" or status == "succeeded" or status == "failed", "Attempt to update run_stats where status is not one of started | waiting | succeeded | failed: " + status
        self.cursor.execute("select database_name from run_stats where database_name = '" + self.mvdb + "'")
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            # insert
            insert_cmd = 'INSERT INTO run_stats (script_name, run_start_time, run_finish_time, database_name, status) VALUES ("' + self.script_name + '", "' + utc_start + '","' + utc_end + '","' + self.mvdb + '", "' + status + '");'
            self.cursor.execute(insert_cmd)
            self.cnx.commit()
        else:
            # update
            qd = [utc_start, utc_end, status]
            update_cmd = 'update run_stats set run_start_time=%s, run_finish_time=%s, status=%s where database_name = "' + self.mvdb + '" and script_name = "' + self.script_name + '";'
            self.cursor.execute(update_cmd, qd)
            self.cnx.commit()

    def get_app_reference(self):
        return self.app_reference

    def get_data_table_pattern_list(self):
        return self.line_data_table

    def mysql_prep_tables(self):
        try:
            self.cnx = pymysql.connect(read_default_file=self.cnf_file,
                                       cursorclass=pymysql.cursors.DictCursor)
            self.cnx.autocommit = True
            self.cursor = self.cnx.cursor()
            self.cursor = self.cnx.cursor(pymysql.cursors.DictCursor)
            self.cursor.execute('set group_concat_max_len=4294967295;')

        except pymysql.Error as e:
            print(self.script_name + "- Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)

        # see if the metadata database already exists - create it if it does not
        print(self.script_name + " - Checking for " + self.metadata_database)
        self.cursor.execute('show databases like "' + self.metadata_database + '";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            create_db_query = 'create database ' + self.metadata_database + ';'
            self.cursor.execute(create_db_query)
            self.cnx.commit()

        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()

        # see if the metadata tables already exist - create them if they do not
        print(self.script_name + " - Checking for metadata tables")
        self.cursor.execute('show tables like "{}_dev";'.format(self.metadata_table))
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            print(self.script_name + " - Metadata dev table does not exist--creating it")
            create_table_query = 'create table {}_dev (db varchar(255), model varchar(255), display_text varchar(255), regions varchar(1023), levels varchar(1023), fcst_lens varchar(2047), variables varchar(1023), fcst_orig varchar(2047), mindate int(11), maxdate int(11), numrecs int(11), updated int(11));'.format(
                self.metadata_table)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        self.cursor.execute('show tables like "{}";'.format(self.metadata_table))
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            print(self.script_name + " - Metadata prod table does not exist--creating it")
            create_table_query = 'create table {} like {}_dev;'.format(self.metadata_table, self.metadata_table)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        print(self.script_name + " - Deleting from metadata dev table")
        self.cursor.execute("delete from {}_dev;".format(self.metadata_table))
        self.cnx.commit()

        # see if the metadata group tables already exist - create them if they do not
        self.cursor.execute('show tables like "{}_dev";'.format(self.database_groups))
        if self.cursor.rowcount == 0:
            print(self.script_name + " - Database group dev table does not exist--creating it")
            create_table_query = 'create table {}_dev (db_group varchar(255), dbs varchar(32767));'.format(
                self.database_groups)
            self.cursor.execute(create_table_query)
            self.cnx.commit()
        self.cursor.execute('show tables like "{}";'.format(self.database_groups))
        if self.cursor.rowcount == 0:
            print(self.script_name + " - Database group prod table does not exist--creating it")
            create_table_query = 'create table {} like {}_dev;'.format(self.database_groups, self.database_groups)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        print(self.script_name + " - Deleting from group dev table")
        self.cursor.execute("delete from {}_dev;".format(self.database_groups))
        self.cnx.commit()

        # see if the metadata_script_info tables already exist
        print("Checking for metadata_script_info tables")
        self.cursor.execute('show tables like "metadata_script_info";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            self._create_metadata_script_info_table()
        # run stats is used by MEupdate_update.py - because it has to wait for completion
        self.cursor.execute('show tables like "run_stats";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            self._create_run_stats_table()

    def deploy_dev_table_and_close_cnx(self):
        groups_table = self.database_groups
        metadata_table = self.metadata_table
        metadata_table_tmp = metadata_table + "_tmp"
        tmp_metadata_table = "tmp_" + metadata_table
        metadata_table_dev = metadata_table + "_dev"

        print(self.script_name + " - Publishing metadata")
        self.cursor.execute("use  " + self.metadata_database + ";")
        self.cnx.commit()

        devcnx = pymysql.connect(read_default_file=self.cnf_file)
        devcnx.autocommit = True
        devcursor = devcnx.cursor(pymysql.cursors.DictCursor)
        devcursor.execute("use  " + self.metadata_database + ";")
        devcnx.commit()

        # reconcile the ...mats_metadata_dev and the mats_metadata tables by first doing a union
        # with rename tables. Renaming tables considers table locking and won't proceed while tables are being accessed.
        # this should prevent invalid operations during the reconciliation.
        # Then we have to reconcile individual fields - regions, levels, fcst_lens, variables, fcst_orig, mindate, maxdate, numrecs, and updated fields
        # first Union the tables
        d = {'mdt': metadata_table, 'mdt_tmp': metadata_table_tmp, 'mdt_dev': metadata_table_dev,
             'tmp_mdt': tmp_metadata_table}
        self.cursor.execute("drop table if exists {tmp_mdt};".format(**d))
        self.cnx.commit()
        self.cursor.execute("drop table if exists {mdt_tmp};".format(**d))
        self.cnx.commit()
        self.cursor.execute("create table {mdt_tmp} like {mdt_dev};".format(**d))
        self.cnx.commit()
        self.cursor.execute("insert into {mdt_tmp} select * from {mdt} union select * from {mdt_dev};".format(**d))
        self.cnx.commit()
        self.cursor.execute("rename table {mdt} to {tmp_mdt}, {mdt_tmp} to {mdt};".format(**d))
        self.cnx.commit()
        self.cursor.execute("drop table if exists {tmp_mdt};".format(**d))
        self.cnx.commit()

        # now reconcile the fields.
        # ....mats_metadata possibly has more rows than ...mats_metadata_dev

        self.cursor.execute(
            'select db, model, ' + ",".join(self.int_fields) + ' from ' + metadata_table + ' order by db, model;')
        self.cnx.commit()
        int_metadata = self.cursor.fetchall()
        self.reconcile_ints(int_metadata, devcursor, devcnx)

        self.cursor.execute(
            'select db, model, ' + ",".join(self.string_fields) + ' from ' + metadata_table + ' order by db, model;')
        self.cnx.commit()
        string_metadata = self.cursor.fetchall()
        self.reconcile_strings(string_metadata, devcursor, devcnx)

        # finally copy the groups
        gd = {'database_groups': groups_table, 'database_groups_dev': groups_table + "_dev"}
        self.cursor.execute("delete from {database_groups};".format(**gd))
        self.cnx.commit()
        self.cursor.execute("insert into {database_groups} select * from {database_groups_dev};".format(**gd))
        self.cnx.commit()

    def reconcile_strings(self, string_metadata, devcursor, devcnx):
        md_table = self.metadata_table
        for d in range(0, len(string_metadata), 1):
            devcursor.execute(
                'select ' + ','.join(self.string_fields) + ' from ' + md_table + ' where db = "' + string_metadata[d][
                    'db'] + '" and model = "' + string_metadata[d]['model'] + '";')
            devcnx.commit()
            needsWrite = False
            reconcile_vals = {}
            dev_vals = devcursor.fetchone()
            for field in self.string_fields:
                if dev_vals[field] != string_metadata[d][field]:
                    needsWrite = True
                    reconcile_vals[field] = str(sorted(list(
                        set(ast.literal_eval(dev_vals[field])) | set(ast.literal_eval(string_metadata[d][field])))))
                else:
                    reconcile_vals[field] = string_metadata[d][field]
            if needsWrite:
                update_command = 'update ' + md_table + ' set '
                first = True
                for field in self.string_fields:
                    if first:
                        first = False
                    else:
                        update_command += ', '
                    update_command += field + ' = "' + reconcile_vals[field] + '"'
                update_command += ' where db = "' + string_metadata[d]['db'] + "' and model = '" + string_metadata[d]['model'] + '";'
                devcursor.execute(update_command)
                devcnx.commit()

    def reconcile_ints(self, int_metadata, devcursor, devcnx):
        md_table = self.metadata_table
        for d in range(0, len(int_metadata), 1):
            devcursor.execute(
                'select ' + ','.join(self.int_fields) + ' from ' + md_table + ' where db = "' + int_metadata[d][
                    'db'] + '" and model = "' + int_metadata[d]['model'] + '";')
            devcnx.commit()
            needsWrite = False
            reconcile_vals = {}
            dev_vals = devcursor.fetchone()
            if dev_vals is None:
                needsWrite = True
                reconcile_vals['mindate'] = int_metadata[d]['mindate']
                reconcile_vals['maxdate'] = int_metadata[d]['maxdate']
                reconcile_vals['numrecs'] = int_metadata[d]['numrecs']
                reconcile_vals['updated'] = int_metadata[d]['updated']
            else:
                if dev_vals['mindate'] != int_metadata[d]['mindate']:
                    needsWrite = True
                    reconcile_vals['mindate'] = int_metadata[d]['mindate'] if int_metadata[d]['mindate'] < dev_vals[
                        'mindate'] else dev_vals['mindate']
                else:
                    reconcile_vals['mindate'] = int_metadata[d]['mindate']
                if dev_vals['maxdate'] != int_metadata[d]['maxdate']:
                    needsWrite = True
                    reconcile_vals['maxdate'] = int_metadata[d]['maxdate'] if int_metadata[d]['maxdate'] > dev_vals[
                        'maxdate'] else dev_vals['maxdate']
                else:
                    reconcile_vals['maxdate'] = int_metadata[d]['maxdate']
                if dev_vals['numrecs'] != int_metadata[d]['numrecs']:
                    needsWrite = True
                    reconcile_vals['numrecs'] = int_metadata[d]['numrecs'] if int_metadata[d]['numrecs'] > dev_vals[
                        'numrecs'] else dev_vals['numrecs']
                else:
                    reconcile_vals['numrecs'] = int_metadata[d]['numrecs']
                if dev_vals['updated'] != int_metadata[d]['updated']:
                    needsWrite = True
                    reconcile_vals['updated'] = int_metadata[d]['updated'] if int_metadata[d]['updated'] > dev_vals[
                        'updated'] else dev_vals['updated']
                else:
                    reconcile_vals['updated'] = int_metadata[d]['updated']
            if needsWrite:
                vals = {"md_table": md_table, "db": int_metadata[d]['db'], "model": int_metadata[d]['model'],
                        "mindate": str(reconcile_vals['mindate']), "maxdate": str(reconcile_vals['maxdate']),
                        "numrecs": str(reconcile_vals['numrecs']), "updated": str(reconcile_vals['updated'])}
                update_cmd = """update {md_table} 
                    set mindate = {mindate}, 
                    maxdate = {maxdate}, 
                    numrecs = {numrecs}, 
                    updated = {updated} 
                    where db = '{db}' and model = '{model}';""".format(**vals)
                devcursor.execute(update_cmd)
                devcnx.commit()

    def strip_level(self, elem):
        # helper function for sorting levels
        if elem[0] in ['P', 'Z', 'H', 'L']:
            if '-' not in elem:
                return int(elem[1:])
            else:
                hyphen_idx = elem.find('-')
                return int(elem[1:hyphen_idx])
        else:
            return 0

    def get_default_fcsts(self, mvdb, model):
        # get the default fcst_leads from the table if there is a match on the model name, otherwise get the default
        # if there is no fcst_leads_defaults table create it.
        # if there is no entry for this model...
        #     search for an entry like this model among the defaults
        # if there is no default entry like this model use the overall default set

        default_fcst_Cnx = pymysql.connect(read_default_file=self.cnf_file)
        default_fcst_Cnx.autocommit = True
        default_fcst_cursor = default_fcst_Cnx.cursor(pymysql.cursors.DictCursor)
        default_fcst_cursor.execute("use  " + self.metadata_database + ";")
        default_fcst_Cnx.commit()
        # if there is no default_fcst_length table, create it and populate it
        default_fcst_cursor.execute('show tables like "default_fcst_leads";')
        if default_fcst_cursor.rowcount == 0:
            print(self.script_name + " - default_fcst_leads table does not exist--creating it")
            create_table_query = 'create table default_fcst_leads (id int NOT NULL AUTO_INCREMENT, db varchar(255), model varchar(255), fcst_leads varchar(2047), fcst_leads_orig varchar(2047), mindate int(11), maxdate int(11), PRIMARY KEY (id));'
            default_fcst_cursor.execute(create_table_query)
            self.cnx.commit()
        # search for this model by exact match - maybe it has already been processed
        default_fcst_cursor.execute(
            "select fcst_leads,fcst_leads_orig, mindate, maxdate from default_fcst_leads where db = '" + mvdb + "' and model = '" + model + "';")
        default_fcst_Cnx.commit()
        if default_fcst_cursor.rowcount == 0:
            # this model needs default data which is just the distinct fcst_leads for all the line_data unqualified by region, model, level etc.
            # record the default data so that it could be corrected in the table, if need be
            default_fcst_cursor.execute("select distinct fcst_lead from " + mvdb + "." + self.line_data_table + ";")
            default_fcst_Cnx.commit()
            fcst_leads_array = set()
            tmp_fcst_leads_array = list(default_fcst_cursor.fetchall())
            for d in tmp_fcst_leads_array:
                fcst_lead = d['fcst_lead'] if int(d['fcst_lead']) % 10000 != 0 else int(d['fcst_lead']) / 10000
                fcst_leads_array.add(int(fcst_lead))
            fcst_leads = str(list(map(str, sorted(fcst_leads_array))))
            fcst_leads_orig_array = ["dflt"] * len(fcst_leads_array)
            fcst_leads_orig = str(fcst_leads_orig_array)
            mindate = int((datetime.utcnow() - timedelta(days=5 * 365)).replace(
                tzinfo=timezone.utc).timestamp())  # five years ago
            maxdate = int(datetime.utcnow().replace(tzinfo=timezone.utc).timestamp())
            qd = []
            insert_row = "insert into default_fcst_leads (db, model, fcst_leads, fcst_leads_orig, mindate, maxdate) values(%s, %s, %s, %s, %s, %s)"
            qd.append(mvdb)
            qd.append(model)
            qd.append(fcst_leads)
            qd.append(fcst_leads_orig)
            qd.append(mindate)
            qd.append(maxdate)
            default_fcst_cursor.execute(insert_row, qd)
            default_fcst_Cnx.commit()
            default_vals = {"fcst_leads": fcst_leads, "fcst_leads_orig": fcst_leads_orig, "mindate": mindate,
                            "maxdate": maxdate}
        else:
            default_vals = default_fcst_cursor.fetchone()
        return default_vals

    def insert_default_fcst_leads_for_model(self, default_model, init, stridep, endp, default_fcst_cursor,
                                            default_fcst_Cnx, isDefaultModel):
        qd = []
        fcst_leads = []
        fcst_leads_orig = []
        ind = init
        end = endp
        stride = stridep
        default_model = default_model
        if isDefaultModel:
            defaultVal = 1
        else:
            defaultVal = 0
        while ind < end:
            fcst_leads.append(str(ind))
            fcst_leads_orig.append("dflt")
            ind += stride
        fcst_leads_str = ",".join(fcst_leads)
        fcst_leads_orig_str = ",".join(fcst_leads_orig)
        insert_row = "insert into default_fcst_leads (model, fcst_leads, fcst_leads_orig, default_model) values(%s, %s, %s, %s)"
        qd.append(default_model)
        qd.append(fcst_leads_str)
        qd.append(fcst_leads_orig_str)
        qd.append(defaultVal)
        default_fcst_cursor.execute(insert_row, qd)
        default_fcst_Cnx.commit()

    def build_stats_object(self):
        print(self.script_name + " - Compiling metadata")
        self.dbs_too_large = {}
        # Open two additional connections to the database
        try:
            cnx2 = pymysql.connect(read_default_file=self.cnf_file)
            cnx2.autocommit = True
            cursor2 = cnx2.cursor(pymysql.cursors.DictCursor)
            cursor2.execute('set group_concat_max_len=4294967295;')
            cnx2.commit()
        except pymysql.Error as e:
            print(self.script_name + " - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)
        try:
            cnx3 = pymysql.connect(read_default_file=self.cnf_file)
            cnx3.autocommit = True
            cursor3 = cnx3.cursor(pymysql.cursors.DictCursor)
            cursor3.execute('set group_concat_max_len=4294967295;')
            cnx3.commit()
        except pymysql.Error as e:
            print(self.script_name + " - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)

        # Get list of databases here
        # if a database name was supplied AND that database exists it will be the only mvdb in the list
        # if there were no database name supplied all of the existing ones will be added
        mvdbs = []
        show_mvdbs = 'show databases like "mv_%";'
        self.cursor.execute(show_mvdbs)
        self.cnx.commit()
        rows = self.cursor.fetchall()
        for row in rows:
            if self.mvdb == "all":
                mvdbs.append(list(row.values())[0])
            else:
                if self.mvdb == list(row.values())[0]:
                    mvdbs.append(self.mvdb)
        # Find the metadata for each database
        per_mvdb = {}
        db_groups = {}
        for mvdb in mvdbs:
            needs_default_metadata = False
            per_mvdb[mvdb] = {}
            db_has_valid_data = False
            use_db = "use " + mvdb
            self.cursor.execute(use_db)
            self.cnx.commit()
            cursor2.execute(use_db)
            cnx2.commit()
            print("\n\n" + self.script_name + "- Using db " + mvdb)

            self.cursor.execute("select count(*) as count from " + self.line_data_table + ";")
            self.cnx.commit()
            line_count = self.cursor.fetchone()['count']
            self.cursor.execute(
                "select count(distinct stat_header_id) as header_id_count from stat_header;")
            self.cnx.commit()
            static_header_id_count = self.cursor.fetchone()['header_id_count']
            compound_size = int(static_header_id_count) * int(line_count)
            if (compound_size > int(self.data_table_stat_header_id_limit)):
                print(
                    self.script_name + " - Using db: " + mvdb + " number of iterations is too large, line_data: " + str(
                        line_count) +
                    " stat_header_ids: " + str(static_header_id_count) + " compund iterations: " + str(
                        compound_size) + " > " + str(
                        self.data_table_stat_header_id_limit) + " - DEFAULTING METADATA for this database: " + mvdb)
                self.dbs_too_large[mvdb] = {"compound_size": str(compound_size),
                                            "header_id_count": str(static_header_id_count),
                                            "line_count": line_count}
                needs_default_metadata = True
            # Get the models in this database
            get_models = 'select distinct model from stat_header;'
            self.cursor.execute(get_models)
            self.cnx.commit()
            for line in self.cursor:
                model = list(line.values())[0]
                per_mvdb[mvdb][model] = {}
                print("\n" + self.script_name + " - Processing model " + model)

                # Get the regions for this model in this database
                get_regions = 'select distinct vx_mask from stat_header where model ="' + model + '";'
                per_mvdb[mvdb][model]['regions'] = []
                print(self.script_name + " - Getting regions for model " + model)
                cursor2.execute(get_regions)
                cnx2.commit()
                for line2 in cursor2:
                    region = list(line2.values())[0]
                    per_mvdb[mvdb][model]['regions'].append(region)
                per_mvdb[mvdb][model]['regions'].sort()

                # Get the levels for this model in this database
                get_levels = 'select distinct fcst_lev from stat_header where model ="' + model + '";'
                per_mvdb[mvdb][model]['levels'] = []
                print(self.script_name + " - Getting levels for model " + model)
                cursor2.execute(get_levels)
                cnx2.commit()
                for line2 in cursor2:
                    level = list(line2.values())[0]
                    per_mvdb[mvdb][model]['levels'].append(level)
                per_mvdb[mvdb][model]['levels'].sort(key=self.strip_level)

                # Get the variables for this model in this database
                get_vars = 'select distinct fcst_var from stat_header where model ="' + model + '";'
                per_mvdb[mvdb][model]['variables'] = []
                print(self.script_name + " - Getting variables for model " + model)
                cursor2.execute(get_vars)
                cnx2.commit()
                for line2 in cursor2:
                    variable = list(line2.values())[0]
                    per_mvdb[mvdb][model]['variables'].append(variable)
                per_mvdb[mvdb][model]['variables'].sort()

                print(self.script_name + " - Getting fcst lens for model " + model)
                temp_fcsts = set()
                temp_fcsts_orig = set()
                get_stat_header_ids = "select stat_header_id from stat_header where model='" + model + "';"
                cursor2.execute(get_stat_header_ids)
                cnx2.commit()
                stat_header_id_values = cursor2.fetchall()
                stat_header_id_list = [d['stat_header_id'] for d in stat_header_id_values if 'stat_header_id' in d]
                per_mvdb[mvdb][model]['fcsts'] = []
                per_mvdb[mvdb][model]['fcst_orig'] = []
                if needs_default_metadata:
                    print(self.script_name + "Using default metadata for db: " + mvdb)
                    default_metadata = self.get_default_fcsts(mvdb, model)
                    per_mvdb[mvdb][model]['fcsts'] = default_metadata['fcst_leads']
                    per_mvdb[mvdb][model]['fcst_orig'] = default_metadata['fcst_leads_orig']
                    print(self.script_name + "Using default stats for db: " + mvdb)
                    per_mvdb[mvdb][model]['mindate'] = default_metadata['mindate']
                    per_mvdb[mvdb][model]['maxdate'] = default_metadata['maxdate']
                    # numrecs is one - just a positive number - wrong but sufficient for defaults
                    cursor2.execute(
                        "select count(stat_header_id) as count from " + mvdb + "." + self.line_data_table + ";")
                    cnx2.commit()
                    numrecs = cursor2.fetchone()['count']
                    per_mvdb[mvdb][model]['numrecs'] = numrecs
                else:
                    if stat_header_id_list is not None:
                        for stat_header_id in stat_header_id_list:
                            get_fcsts = "select distinct fcst_lead from  " + self.line_data_table + " where stat_header_id = '" + str(
                                stat_header_id) + "';"
                            cursor2.execute(get_fcsts)
                            cnx2.commit()
                            for line2 in cursor2:
                                fcst = int(list(line2.values())[0])
                                temp_fcsts_orig.add(fcst)
                                if fcst % 10000 == 0:
                                    fcst = int(fcst / 10000)
                                temp_fcsts.add(fcst)

                        per_mvdb[mvdb][model]['fcsts'] = list(map(str, sorted(temp_fcsts)))
                        per_mvdb[mvdb][model]['fcst_orig'] = list(map(str, sorted(temp_fcsts_orig)))

                        print(self.script_name + " - Getting stats for model " + model)
                        num_recs = 0
                        min = datetime.max
                        max = datetime.min  # earliest epoch?
                        for stat_header_id in stat_header_id_list:
                            get_stats = 'select min(fcst_valid_beg) as mindate, max(fcst_valid_beg) as maxdate, count(fcst_valid_beg) as numrecs from ' + self.line_data_table + ' where stat_header_id  = "' + str(
                                stat_header_id) + '";'
                            cursor2.execute(get_stats)
                            cnx2.commit()
                            data = cursor2.fetchone()
                            if data is not None:
                                min = min if data['mindate'] is None or min < data['mindate'] else data['mindate']
                                max = max if data['maxdate'] is None or max > data['maxdate'] else data['maxdate']
                                num_recs = num_recs + data['numrecs']
                        if (min is None or min is datetime.max):
                            min = datetime.utcnow()
                        if (max is None is max is datetime.min):
                            max = datetime.utcnow()

                        per_mvdb[mvdb][model]['mindate'] = int(min.replace(tzinfo=timezone.utc).timestamp())
                        per_mvdb[mvdb][model]['maxdate'] = int(max.replace(tzinfo=timezone.utc).timestamp())
                        per_mvdb[mvdb][model]['numrecs'] = num_recs
                if int(per_mvdb[mvdb][model]['numrecs']) > int(0):
                    db_has_valid_data = True
                    print("\n" + self.script_name + " - Storing metadata for model " + model)
                    self.add_model_to_metadata_table(cnx3, cursor3, mvdb, model, per_mvdb[mvdb][model])
                else:
                    print("\n" + self.script_name + "  - No valid metadata for model " + model)

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
            print(self.script_name + " - Error closing 2nd cursor: " + str(e))
            traceback.print_stack()
        try:
            cursor3.close()
            cnx3.close()
        except pymysql.Error as e:
            print(self.script_name + " - Error closing 3rd cursor: " + str(e))
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
            insert_row = "insert into {}_dev (db, model, display_text, regions, levels, fcst_lens, variables, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)".format(
                self.metadata_table)
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
        groups_table = self.database_groups + "_dev"
        for group in db_groups:
            gd = {"groups_table": groups_table}
            qd = []
            insert_row = "insert into {groups_table} (db_group, dbs) values(%s, %s)".format(**gd)
            qd.append(group)
            qd.append(str(db_groups[group]))
            self.cursor.execute(insert_row, qd)
            self.cnx.commit()

    # have to wait for other instantiations updaters to finish before we can continue.
    def wait_on_other_updates(self, timeout, period=1):
        print(self.script_name + " waiting on other process")
        mustend = tm.time() + timeout
        self.cursor.execute("select * from metadata_script_info")
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            return False
        waiting = True
        while tm.time() < mustend and not waiting:
            # some sort of check for running updates
            self.cursor.execute("select app_reference from metadata_script_info where running != 0")
            self.cnx.commit()
            if self.cursor.rowcount > 0:
                tm.sleep(period)
            else:
                print(self.script_name + " clear to go")
                waiting = False
                break;

        return False

    def main(self, options):
        self.validate_options(options)
        self.data_table_stat_header_id_limit = options.get('data_table_stat_header_id_limit', self.data_table_stat_header_id_limit)
        self.metadata_database = options['metadata_database']
        self.cnf_file = options['cnf_file']
        if options['mvdb'] is None:
            self.mvdb = "all"
        else:
            self.mvdb = options['mvdb']
        self.refresh_url = options['metexpress_base_url'] + "/" + self.get_app_reference() + "/refreshMetadata"
        self.mysql_prep_tables()
        self.set_running(True)
        self.utc_start = str(datetime.utcnow())
        self.update_status("waiting", self.utc_start, str(datetime.utcnow()))
        self.wait_on_other_updates(2 * 3600, 5)  # max three hours?
        self.update_status("started", self.utc_start, str(datetime.utcnow()))
        try:
            self.build_stats_object()
            self.deploy_dev_table_and_close_cnx()
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            urllib.request.urlopen(self.refresh_url, data=None, cafile=None, capath=None, cadefault=False, context=ctx)
        except Exception as ex:
            print(self.script_name + ": Exception: " + str(ex))
            traceback.print_stack()
            self.update_status("failed", self.utc_start, str(datetime.utcnow()))
        finally:
            self.set_running(False)
            self.update_status("succeeded", self.utc_start, str(datetime.utcnow()))
        return self.dbs_too_large

    # makes sure all expected options were indeed passed in
    @classmethod
    def validate_options(self, options):
        assert True, options['cnf_file'] is not None and options['metadata_database'] is not None

    # process 'c' style options - using getopt - usage describes options
    # cnf_file - mysql cnf file, db - prescribed db to process, metexpress_base_url - metexpress address
    # (m)ats_metadata_database_name] allows to override the default metadata databasename (mats_metadata) with something
    # db is a prescribed database to process (selective mode) used by mv_load, if it is missing then all databases will be processed
    # (D)ata_table_stat_header_id_limit, (d)atabase name, (u)=metexpress_base_url are all optional for selective mode
    @classmethod
    def get_options(self, args):
        usage = ["(c)nf_file=", "[(m)ats_metadata_database_name]",
                 "[(D)ata_table_stat_header_id_limit - default is 10,000,000,000]",
                 "[(d)atabase name]" "(u)=metexpress_base_url"]
        cnf_file = None
        db = None
        metexpress_base_url = None
        metadata_database = "mats_metadata"
        data_table_stat_header_id_limit = 10000000000

        try:
            opts, args = getopt.getopt(args[1:], "c:d:u:m:D:u:", usage)
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
            elif o == "-D":
                data_table_stat_header_id_limit = a
            elif o == "-d":
                db = a
            elif o == "-m":
                metadata_database = a
            elif o == "-u":
                metexpress_base_url = a
            else:
                assert False, "unhandled option"
        # make sure none were left out...
        assert cnf_file is not None and metadata_database is not None and metexpress_base_url is not None
        options = {'cnf_file': cnf_file, 'data_table_stat_header_id_limit': data_table_stat_header_id_limit,
                   "metadata_database": metadata_database, "metexpress_base_url": metexpress_base_url, "mvdb": db}
        return options


if __name__ == '__main__':
    start = str(datetime.now())
    print('Anomalycor MATS FOR MET METADATA START: ' + start)
    options = MEAnomalycor.get_options(sys.argv)
    me_dbcreator = MEAnomalycor()
    me_dbcreator.main(options)
    if me_dbcreator.dbs_too_large:  # if there are any too large
        print("Did not process these databases due to being to large -- " + json.dumps(me_dbcreator.dbs_too_large))
    print('Anomalycor MATS FOR MET METADATA END: ' + str(datetime.now()) + " started at: " + start)
    sys.exit(0)
