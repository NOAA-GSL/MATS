from __future__ import print_function

import ast
import getopt
import json
import ssl
import sys
import time as tm
import traceback
import urllib.request
from abc import abstractmethod
from datetime import datetime, timezone

import pymysql

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
# set to False to limit print output
debug = False


# debug = False
class ParentMetadata:
    def __init__(self, options, data_table_stat_header_id_limit=10000000000):
        # self.script_name = os.path.basename(sys.argv[0]).replace('.py', '')
        self.utc_start = str(datetime.utcnow())
        self.refresh_url = options['metexpress_base_url'] + "/" + options['app_reference'] + "/refreshMetadata"
        self.metadata_database = options['metadata_database']
        self.cnf_file = options['cnf_file']
        self.data_table_stat_header_id_limit = data_table_stat_header_id_limit
        if options['mvdb'] is None:
            self.mvdb = "all"
        else:
            self.mvdb = options['mvdb']
        self.script_name = options['name']
        self.line_data_table = options['line_data_table']
        self.metadata_table = options['metadata_table']
        self.app_reference = options['app_reference']
        self.database_groups = options['database_groups']
        self.appSpecificWhereClause = options['appSpecificWhereClause']
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
               ) comment 'keep track of update metadata run status';""")
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
            self.cursor = self.cnx.cursor(pymysql.cursors.DictCursor)
            self.cursor.execute('set group_concat_max_len=4294967295;')
            # Very important -- set the session sql mode such that group by queries work without having to select the group by field
            self.cursor.execute('set session sql_mode="NO_AUTO_CREATE_USER";')

        except pymysql.Error as e:
            print(self.script_name + "- Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)

        # see if the metadata database already exists - create it if it does not
        print(self.script_name + " - Checking for " + self.metadata_database)
        self.cursor.execute('show databases like "' + self.metadata_database + '";')
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
            create_table_query = 'create table {}_dev (db varchar(255), model varchar(255), display_text varchar(255), line_data_table varchar(255), variable varchar(255), regions varchar(4095), levels varchar(4095), fcst_lens varchar(4095), trshs varchar(4095), gridpoints varchar(4095), truths varchar(4095), fcst_orig varchar(4095), mindate int(11), maxdate int(11), numrecs int(11), updated int(11));'.format(self.metadata_table)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        self.cursor.execute('show tables like "{}";'.format(self.metadata_table))
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            print(self.script_name + " - Metadata prod table does not exist--creating it")
            create_table_query = 'create table {} like {}_dev;'.format(self.metadata_table, self.metadata_table)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        self.cursor.execute("delete from {}_dev;".format(self.metadata_table))
        self.cnx.commit()

        # see if the metadata group tables already exist - create them if they do not
        self.cursor.execute('show tables like "{}_dev";'.format(self.database_groups))
        if self.cursor.rowcount == 0:
            create_table_query = 'create table {}_dev (db_group varchar(255), dbs varchar(32767));'.format(
                self.database_groups)
            self.cursor.execute(create_table_query)
            self.cnx.commit()
        self.cursor.execute('show tables like "{}";'.format(self.database_groups))
        if self.cursor.rowcount == 0:
            create_table_query = 'create table {} like {}_dev;'.format(self.database_groups, self.database_groups)
            self.cursor.execute(create_table_query)
            self.cnx.commit()

        self.cursor.execute("delete from {}_dev;".format(self.database_groups))
        self.cnx.commit()

        # see if the metadata_script_info tables already exist
        self.cursor.execute('show tables like "metadata_script_info";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            self._create_metadata_script_info_table()
        # run stats is used by MEupdate_update.py - because it has to wait for completion
        self.cursor.execute('show tables like "run_stats";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            self._create_run_stats_table()

    def reconcile_groups(self, groups_table):
        gd = {'database_groups': groups_table, 'database_groups_dev': groups_table + "_dev"}
        # if this is an "all" databases run clear out the groups table to remove possible
        # double entries in the event that a database had no groups and was changed
        # to have a group
        if self.mvdb == "all":
            self.cursor.execute("delete from {database_groups};".format(**gd))
            self.cnx.commit()
        # get the new groups
        self.cursor.execute("select db_group, dbs from {database_groups_dev};".format(**gd))
        self.cnx.commit()
        dev_groups = list(self.cursor.fetchall())
        # get the old groups
        self.cursor.execute("select db_group, dbs from {database_groups};".format(**gd))
        self.cnx.commit()
        existing_groups = list(self.cursor.fetchall())
        existing_group_names = set()
        # get the existing group db names
        for eg in existing_groups:
            # get the group
            existing_group_names.add(eg['db_group'])
        for dg in dev_groups:
            # get the group
            dev_group_name = dg['db_group']
            # get a list of the dbs for this group
            dev_dbs = set(ast.literal_eval(dg['dbs']))
            # does this group exist in the old groups....
            gd.update({"group": dev_group_name})
            if dev_group_name in existing_group_names:
                # do a union and an update
                # get the existing group db names
                for eg in existing_groups:
                    existing_dbs = []
                    if eg['db_group'] == dev_group_name:
                        existing_dbs = set(ast.literal_eval(eg['dbs']))
                        break
                # union the existing and new ones
                new_dbs = list(existing_dbs | dev_dbs)
                gd.update({"new_dbs": new_dbs})
                self.cursor.execute(
                    "update {database_groups} set dbs = \"{new_dbs}\" where db_group = \"{group}\";".format(**gd))
                self.cnx.commit()
            else:
                # do an insert
                self.cursor.execute(
                    "insert into {database_groups} select * from {database_groups_dev} where db_group = \"{group}\";".format(
                        **gd))
                self.cnx.commit()

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

        # use a tmp table to hold the new metadata then do a rename of the tmop metadata to the metadata
        # have to do all this extra checking to avoid warnings from mysql
        # apparently if exists doesn't quite work right
        d = {'mdt': metadata_table, 'mdt_tmp': metadata_table_tmp, 'mdt_dev': metadata_table_dev,
             'tmp_mdt': tmp_metadata_table}
        self.cursor.execute("show tables like '{tmp_mdt}';".format(**d))
        if self.cursor.rowcount > 0:
            self.cursor.execute("drop table if exists {tmp_mdt};".format(**d))
            self.cnx.commit()
        self.cursor.execute("show tables like '{mdt_tmp}';".format(**d))
        if self.cursor.rowcount > 0:
            self.cursor.execute("drop table if exists {mdt_tmp};".format(**d))
            self.cnx.commit()
        self.cursor.execute("create table {mdt_tmp} like {mdt_dev};".format(**d))
        self.cnx.commit()
        # since we processed the entire database we assume that what is in the dev metadata table is correct.
        # copy the metadata data to the tmp_metadata table
        self.cursor.execute("insert into {mdt_tmp} select * from {mdt};".format(**d))
        self.cnx.commit()
        # iterate the db model pairs in the metadata_dev table
        self.cursor.execute("select * from {mdt_dev};".format(**d))
        self.cnx.commit()
        dev_rows = self.cursor.fetchall()
        for dev_row in dev_rows:
            d['db'] = dev_row['db']
            d['model'] = dev_row['model']
            self.cursor.execute('select * from {mdt_tmp} where db = "{db}" and model = "{model}";'.format(**d))
            self.cnx.commit()
            # does it exist in the tmp_metadata table?
            if self.cursor.rowcount > 0:
                # yes - then delete the entry from tmp_metadata table
                self.cursor.execute('delete from {mdt_tmp} where db = "{db}" and model = "{model}";'.format(**d))
                self.cnx.commit()
            # insert the dev data into the tmp_metadata table
            self.cursor.execute(
                'insert into {mdt_tmp} select * from {mdt_dev} where db = "{db}" and model = "{model}";'.format(**d))
            self.cnx.commit()
            d['db'] = ""
            d['model'] = ""
        self.cursor.execute("rename table {mdt} to {tmp_mdt}, {mdt_tmp} to {mdt};".format(**d))
        self.cnx.commit()
        self.cursor.execute("drop table if exists {tmp_mdt};".format(**d))
        self.cnx.commit()
        # finally reconcile the groups
        self.reconcile_groups(groups_table)

    @abstractmethod
    def strip_level(self, elem):
        pass

    @abstractmethod
    def strip_trsh(self, elem):
        pass

    def build_stats_object(self):
        print(self.script_name + " - Compiling metadata")
        self.dbs_too_large = {}
        # Open two additional connections to the database
        try:
            cnx2 = pymysql.connect(read_default_file=self.cnf_file)
            cnx2.autocommit = True
            cursor2 = cnx2.cursor(pymysql.cursors.DictCursor)
            cursor2.execute('set group_concat_max_len=4294967295;')
            # Very important -- set the session sql mode such that group by queries work without having to select the group by field
            cursor2.execute('set session sql_mode="NO_AUTO_CREATE_USER";')
        except pymysql.Error as e:
            print(self.script_name + " - Error: " + str(e))
            traceback.print_stack()
            sys.exit(1)
        try:
            cnx3 = pymysql.connect(read_default_file=self.cnf_file)
            cnx3.autocommit = True
            cursor3 = cnx3.cursor(pymysql.cursors.DictCursor)
            cursor3.execute('set group_concat_max_len=4294967295;')
            # Very important -- set the session sql mode such that group by queries work without having to select the group by field
            cursor3.execute('set session sql_mode="NO_AUTO_CREATE_USER";')
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
            per_mvdb[mvdb] = {}
            db_has_valid_data = False
            use_db = "use " + mvdb
            self.cursor.execute(use_db)
            self.cnx.commit()
            cursor2.execute(use_db)
            cnx2.commit()
            cursor3.execute(use_db)
            cnx3.commit()
            print("\n\n" + self.script_name + "- Using db " + mvdb)

            # Get the models in this database
            get_models = 'select distinct model from stat_header'
            if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                get_models += ' where ' + self.appSpecificWhereClause + ';'
            else:
                get_models += ';'
            self.cursor.execute(get_models)
            self.cnx.commit()
            for line in self.cursor:
                model = list(line.values())[0]
                per_mvdb[mvdb][model] = {}
                print("\n" + self.script_name + " - Processing model " + model)

                # Get the variables for this model in this database
                get_vars = 'select distinct fcst_var from stat_header where model = "' + model + '"'
                if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                    get_vars += ' and ' + self.appSpecificWhereClause + ';'
                else:
                    get_vars += ';'
                if debug:
                    print(self.script_name + " - variable sql query: " + get_vars)
                cursor2.execute(get_vars)
                cnx2.commit()
                for line2 in cursor2:
                    variable = list(line2.values())[0]
                    print("\n" + self.script_name + " - Processing variable " + variable)

                    # Get the regions for this model/variable in this database
                    get_regions = 'select distinct vx_mask from stat_header where model = "' + model + '" and fcst_var = "' + variable + '"'
                    if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                        get_regions += ' and ' + self.appSpecificWhereClause + ';'
                    else:
                        get_regions += ';'
                    tmp_regions_list = []
                    print(self.script_name + " - Getting regions for model " + model + " and variable " + variable)
                    if debug:
                        print(self.script_name + " - region sql query: " + get_regions)
                    cursor3.execute(get_regions)
                    cnx3.commit()
                    for line3 in cursor3:
                        region = list(line3.values())[0]
                        tmp_regions_list.append(region)
                    tmp_regions_list.sort()

                    # Get the levels for this model/variable in this database
                    get_levels = 'select distinct fcst_lev from stat_header where model = "' + model + '" and fcst_var = "' + variable + '"'
                    if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                        get_levels += ' and ' + self.appSpecificWhereClause + ';'
                    else:
                        get_levels += ';'
                    tmp_levels_list = []
                    print(self.script_name + " - Getting levels for model " + model + " and variable " + variable)
                    if debug:
                        print(self.script_name + " - level sql query: " + get_levels)
                    cursor3.execute(get_levels)
                    cnx3.commit()
                    for line3 in cursor3:
                        level = list(line3.values())[0]
                        tmp_levels_list.append(level)
                    tmp_levels_list.sort(key=self.strip_level)

                    # Get the thresholds/variable for this model in this database
                    get_trshs = 'select distinct fcst_thresh from stat_header where model = "' + model + '" and fcst_var = "' + variable + '"'
                    if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                        get_trshs += ' and ' + self.appSpecificWhereClause + ';'
                    else:
                        get_trshs += ';'
                    tmp_trshs_list = []
                    print(self.script_name + " - Getting thresholds for model " + model + " and variable " + variable)
                    if debug:
                        print(self.script_name + " - threshold sql query: " + get_trshs)
                    cursor3.execute(get_trshs)
                    cnx3.commit()
                    for line3 in cursor3:
                        trsh = str(list(line3.values())[0])
                        tmp_trshs_list.append(trsh)
                    tmp_trshs_list.sort(key=self.strip_trsh)

                    # Get the gridpoints for this model/variable in this database
                    get_gridpoints = 'select distinct interp_pnts from stat_header where model = "' + model + '" and fcst_var = "' + variable + '"'
                    if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                        get_gridpoints += ' and ' + self.appSpecificWhereClause + ';'
                    else:
                        get_gridpoints += ';'
                    tmp_gridpoints_list = []
                    print(self.script_name + " - Getting gridpoints for model " + model + " and variable " + variable)
                    if debug:
                        print(self.script_name + " - gridpoints sql query: " + get_gridpoints)
                    cursor3.execute(get_gridpoints)
                    cnx3.commit()
                    for line3 in cursor3:
                        gridpoint = str(list(line3.values())[0])
                        tmp_gridpoints_list.append(gridpoint)
                    tmp_gridpoints_list.sort(key=int)

                    # Get the truths for this model/variable in this database
                    get_truths = 'select distinct obtype from stat_header where model = "' + model + '" and fcst_var = "' + variable + '"'
                    if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                        get_truths += ' and ' + self.appSpecificWhereClause + ';'
                    else:
                        get_truths += ';'
                    tmp_truths_list = []
                    print(self.script_name + " - Getting truths for model " + model + " and variable " + variable)
                    if debug:
                        print(self.script_name + " - truths sql query: " + get_truths)
                    cursor3.execute(get_truths)
                    cnx3.commit()
                    for line3 in cursor3:
                        truth = str(list(line3.values())[0])
                        tmp_truths_list.append(truth)
                    tmp_truths_list.sort()

                    # get the line_date-specific fields
                    for line_data_table in self.line_data_table:
                        # see if this is the first variable we've dealt with,
                        # and if per_mvdb[mvdb][model][line_data_table] is undefined
                        try:
                            per_mvdb[mvdb][model][line_data_table]
                        except NameError:
                            per_mvdb[mvdb][model][line_data_table] = {}
                        per_mvdb[mvdb][model][line_data_table][variable] = {}

                        # store header variables
                        per_mvdb[mvdb][model][line_data_table][variable]['regions'] = tmp_regions_list
                        per_mvdb[mvdb][model][line_data_table][variable]['levels'] = tmp_levels_list
                        per_mvdb[mvdb][model][line_data_table][variable]['trshs'] = tmp_trshs_list
                        per_mvdb[mvdb][model][line_data_table][variable]['gridpoints'] = tmp_gridpoints_list
                        per_mvdb[mvdb][model][line_data_table][variable]['truths'] = tmp_truths_list

                        # get the line_data-specific fields
                        temp_fcsts = set()
                        temp_fcsts_orig = set()
                        per_mvdb[mvdb][model][line_data_table][variable]['fcsts'] = []
                        per_mvdb[mvdb][model][line_data_table][variable]['fcst_orig'] = []
                        num_recs = 0
                        mindate = datetime.max
                        maxdate = datetime.min  # earliest epoch?
                        app_specific_clause = ''
                        if self.appSpecificWhereClause is not None and self.appSpecificWhereClause != "":
                            app_specific_clause = ' and ' + self.appSpecificWhereClause

                        # select the minimum length set of stat_header_ids from the line_data_table that are unique with respect to model, variable, and vx_mask.
                        # these will be used to qualify the distinct set of fcst_leads from the line data table.
                        get_stat_header_ids = "select stat_header_id from " + \
                                              "(select group_concat(stat_header_id) as stat_header_id from stat_header where stat_header_id in (select distinct stat_header_id from " + \
                                              line_data_table + \
                                              " where model = '" + model + \
                                              "' and fcst_var = '" + variable + \
                                              "' order by stat_header_id)" + \
                                              app_specific_clause + \
                                              " group by model, fcst_var, vx_mask) as stat_header_id order by length(stat_header_id) limit 1;"
                        if debug:
                            print(self.script_name + " - Getting get_stat_header_ids lens for model " + model + " and variable " + variable + " sql: " + get_stat_header_ids)
                        try:
                            cursor3.execute(get_stat_header_ids)
                            cnx3.commit()
                            stat_header_id_values = cursor3.fetchall()
                            stat_header_id_list = [d['stat_header_id'] for d in stat_header_id_values if
                                                   'stat_header_id' in d]
                        except pymysql.Error as e:
                            continue

                        if stat_header_id_list is not None and len(stat_header_id_list) > 0:
                            get_fcsts = "select distinct fcst_lead from " + line_data_table + " where stat_header_id in (" + ','.join(
                                stat_header_id_list) + ");"
                            print(self.script_name + " - Getting forecast lengths for model " + model + " and variable " + variable)
                            if debug:
                                print(self.script_name + " - fcst_lead sql query: " + get_fcsts)
                            try:
                                cursor3.execute(get_fcsts)
                                cnx3.commit()
                                for line3 in cursor3:
                                    fcst = int(list(line3.values())[0])
                                    temp_fcsts_orig.add(fcst)
                                    if fcst % 10000 == 0:
                                        fcst = int(fcst / 10000)
                                    temp_fcsts.add(fcst)
                            except pymysql.Error as e:
                                continue
                            get_stats = 'select min(fcst_valid_beg) as mindate, max(fcst_valid_beg) as maxdate, count(fcst_valid_beg) as numrecs from ' + line_data_table + " where stat_header_id in (" + ','.join(
                                stat_header_id_list) + ");"
                            print(self.script_name + " - Getting stats for model " + model + " and variable " + variable)
                            if debug:
                                print(self.script_name + " - stats sql query: " + get_stats)
                            try:
                                cursor3.execute(get_stats)
                                cnx3.commit()
                                data = cursor3.fetchone()
                                if data is not None:
                                    mindate = mindate if data['mindate'] is None or mindate < data['mindate'] else data[
                                        'mindate']
                                    maxdate = maxdate if data['maxdate'] is None or maxdate > data['maxdate'] else data[
                                        'maxdate']
                                    num_recs = num_recs + data['numrecs']
                            except pymysql.Error as e:
                                continue
                        per_mvdb[mvdb][model][line_data_table][variable]['fcsts'] = list(map(str, sorted(temp_fcsts)))
                        per_mvdb[mvdb][model][line_data_table][variable]['fcst_orig'] = list(map(str, sorted(temp_fcsts_orig)))
                        if mindate is None or mindate is datetime.max:
                            mindate = datetime.utcnow()
                        if maxdate is None is maxdate is datetime.min:
                            maxdate = datetime.utcnow()
                        per_mvdb[mvdb][model][line_data_table][variable]['mindate'] = int(mindate.replace(tzinfo=timezone.utc).timestamp())
                        per_mvdb[mvdb][model][line_data_table][variable]['maxdate'] = int(maxdate.replace(tzinfo=timezone.utc).timestamp())
                        per_mvdb[mvdb][model][line_data_table][variable]['numrecs'] = num_recs
                        if int(num_recs) > 0:
                            db_has_valid_data = True
                            print("\n" + self.script_name + " - Storing metadata for model " + model + " and variable " + variable)
                            self.add_model_to_metadata_table(cnx3, cursor3, mvdb, model, line_data_table, variable, per_mvdb[mvdb][model][line_data_table][variable])
                        else:
                            print("\n" + self.script_name + "  - No valid metadata for model " + model + " and variable " + variable)

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
        if debug:
            print(db_groups)
        self.populate_db_group_tables(db_groups)

        # Print full metadata object
        if debug:
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

    def add_model_to_metadata_table(self, cnx_tmp, cursor_tmp, mvdb, model, line_data_table, variable, raw_metadata):
        # Add a row for each model/db combo
        cursor_tmp.execute("use  " + self.metadata_database + ";")
        cnx_tmp.commit()
        #
        if len(raw_metadata['regions']) > 0 and len(raw_metadata['levels']) > 0 and len(
                raw_metadata['fcsts']) > 0 and len(raw_metadata['variables']) > 0:
            qd = []
            updated_utc = datetime.utcnow().strftime('%s')
            mindate = raw_metadata['mindate']
            maxdate = raw_metadata['maxdate']
            display_text = model.replace('.', '_')
            insert_row = "insert into {}_dev (db, model, display_text, line_data_table, variable, regions, levels, fcst_lens, trshs, gridpoints, truths, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)".format(self.metadata_table)
            qd.append(mvdb)
            qd.append(model)
            qd.append(display_text)
            qd.append(line_data_table)
            qd.append(variable)
            qd.append(str(raw_metadata['regions']))
            qd.append(str(raw_metadata['levels']))
            qd.append(str(raw_metadata['fcsts']))
            qd.append(str(raw_metadata['trshs']))
            qd.append(str(raw_metadata['gridpoints']))
            qd.append(str(raw_metadata['truths']))
            qd.append(str(raw_metadata['fcst_orig']))
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(raw_metadata['numrecs'])
            qd.append(updated_utc)
            cursor_tmp.execute(insert_row, qd)
            cnx_tmp.commit()
        # put the cursor back to the db it was using
        cursor_tmp.execute("use  " + mvdb + ";")
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

    def wait_on_other_updates(self, timeout, period=1):
        if debug:
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
                if debug:
                    print(self.script_name + " clear to go")
                waiting = False
                break;

        return False

    @classmethod
    def validate_options(self, options):
        assert True, options['cnf_file'] is not None and options['metadata_database'] is not None

    @classmethod
    # process 'c' style options - using getopt - usage describes options
    # cnf_file - mysql cnf file, db - prescribed db to process, metexpress_base_url - metexpress address
    # (m)ats_metadata_database_name] allows to override the default metadata databasename (mats_metadata) with something
    # db is a prescribed database to process (selective mode) used by mv_load, if it is missing then all databases will be processed
    # (D)ata_table_stat_header_id_limit, (d)atabase name, (u)=metexpress_base_url are all optional for selective mode

    def get_options(self, args):
        usage = ["(c)nf_file=", "[(m)ats_metadata_database_name]",
                 "[(D)ata_table_stat_header_id_limit - default is 10,000,000,000]",
                 "[(d)atabase name]" "(u)=metexpress_base_url"]
        cnf_file = None
        db = None
        metexpress_base_url = None
        metadata_database = "mats_metadata"
        data_table_stat_header_id_limit = None
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
        options = {'cnf_file': cnf_file, "metadata_database": metadata_database,
                   "metexpress_base_url": metexpress_base_url, "mvdb": db}
        if data_table_stat_header_id_limit is not None:
            options['data_table_stat_header_id_limit'] = data_table_stat_header_id_limit
        return options

    def main(self):
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
