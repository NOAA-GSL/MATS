#!/usr/bin/env python
"""
This script updates specified db/model combinations in the metadata tables required for a METexpress upper air app.
It parses the required fields from any databases that begin with 'mv_' in a mysql instance.

Arguments: path to a mysql .cnf file, comma-separated list of db.model pairs to update

Usage: ./selective_update_MEupperair.py path_to_file.cnf db1.model1,db2.model2,...

Author: Molly B Smith
"""

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.

from __future__ import print_function
import sys
import os.path
import urllib.request
import pymysql
import json
from datetime import datetime
import metexpress

class UpdateMEUpperair:
    def __init__(self, options):
        self.cnf_file = options.cnf_file
        self.db_model_input = options.db_model_input
        self.refresh_urls = options.refresh_urls
        self.cnx = pymysql.connect(read_default_file=self.cnf_file)
        self.cnx.autocommit = True
        self.cursor = cnx.cursor(pymysql.cursors.DictCursor)

        self.cnx2 = pymysql.connect(read_default_file=self.cnf_file)
        self.cnx2.autocommit = True
        self.cursor2 = self.cnx2.cursor(pymysql.cursors.DictCursor)

        # see if the metadata database already exists
        self.cursor.execute('show databases like "mats_metadata";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            me = MEUpperair()
            me.main(cnf_file)
        self.cursor.execute("use mats_metadata;")
        self.cnx.commit()

        # see if the metadata tables already exist
        self.cursor.execute('show tables like "upperair_mats_metadata_dev";')
        self.cnx.commit()
        if cursor.rowcount == 0:
            me = MEUpperair()
            me.main(cnf_file)

        self.cursor.execute('show tables like "upperair_mats_metadata";')
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            me = MEUpperair()
            me.main(cnf_file)

        # see if the metadata group tables already exist
        self.cursor.execute('show tables like "upperair_database_groups_dev";')
        if self.cursor.rowcount == 0:
            me = MEUpperair()
            me.main(cnf_file)

        self.cursor.execute('show tables like "upperair_database_groups";')
        if self.cursor.rowcount == 0:
            me = MEUpperair()
            me.main(cnf_file)

    def get_app_reference(self):
        return "met-upperair"

    def get_data_table_pattern_list(self):
        return ['line_data_sl1l2']

    def update_tables_and_close_cnx(self):
        print("Publishing metadata")
        self.cursor.execute("use mats_metadata;")
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
        self.cursor2.close()
        self.cnx2.close()

    def strip_level(self,elem):
        # helper function for sorting levels
        if '-' not in elem:
            return int(elem[1:])
        else:
            hyphen_idx = elem.find('-')
            return int(elem[1:hyphen_idx])


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
            print("\n\nUsing db " + mvdb)

            # Update models in this database
            for model in mvdb_map[mvdb]:
                per_mvdb[mvdb][model] = {}
                print("\nProcessing model " + model)

                # Get the stats for this model in this database
                get_stats = 'select max(ld.fcst_valid_beg) as maxdate, min(ld.fcst_valid_beg) as mindate, count(ld.fcst_valid_beg) as numrecs ' \
                            'from stat_header h, line_data_sl1l2 ld ' \
                            'where ld.stat_header_id = h.stat_header_id ' \
                            'and h.model ="' + model + '" ' \
                            'and h.fcst_lev like "P%";'
                print("Getting stats for model " + model)
                self.cursor.execute(get_stats)
                self.cnx.commit()
                for line2 in self.cursor:
                    line2keys = line2.keys()
                    for line2key in line2keys:
                        val = str(line2[line2key])
                        per_mvdb[mvdb][model][line2key] = val

                # Get the rest of the metadata only if data actually exists
                if int(per_mvdb[mvdb][model]['numrecs']) > int(0):

                    # Get the regions for this model in this database
                    get_regions = 'select distinct vx_mask from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                    per_mvdb[mvdb][model]['regions'] = []
                    print("Getting regions for model " + model)
                    self.cursor.execute(get_regions)
                    self.cnx.commit()
                    for line2 in cursor:
                        region = line2.values()[0]
                        per_mvdb[mvdb][model]['regions'].append(region)
                    per_mvdb[mvdb][model]['regions'].sort()

                    # Get the levels for this model in this database
                    get_levels = 'select distinct fcst_lev from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                    per_mvdb[mvdb][model]['levels'] = []
                    print("Getting levels for model " + model)
                    self.cursor.execute(get_levels)
                    self.cnx.commit()
                    for line2 in cursor:
                        level = line2.values()[0]
                        per_mvdb[mvdb][model]['levels'].append(level)
                    per_mvdb[mvdb][model]['levels'].sort(key=strip_level)

                    # Get the UA variables for this model in this database
                    get_vars = 'select distinct fcst_var from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                    per_mvdb[mvdb][model]['variables'] = []
                    print("Getting variables for model " + model)
                    self.cursor.execute(get_vars)
                    self.cnx.commit()
                    for line2 in self.cursor:
                        variable = line2.values()[0]
                        per_mvdb[mvdb][model]['variables'].append(variable)
                    per_mvdb[mvdb][model]['variables'].sort()

                    # Get the fcst lead times for this model in this database
                    get_fcsts = 'select distinct ld.fcst_lead ' \
                                'from stat_header h, line_data_sl1l2 ld ' \
                                'where ld.stat_header_id = h.stat_header_id ' \
                                'and h.model ="' + model + '" ' \
                                'and h.fcst_lev like "P%";'
                    temp_fcsts = []
                    temp_fcsts_orig = []
                    print("Getting fcst lens for model " + model)
                    self.cursor.execute(get_fcsts)
                    self.cnx.commit()
                    for line2 in self.cursor:
                        fcst = int(line2.values()[0])
                        if fcst % 10000 == 0:
                            temp_fcsts_orig.append(fcst)
                            fcst = fcst / 10000
                        else:
                            temp_fcsts_orig.append(fcst)
                        temp_fcsts.append(fcst)
                    temp_fcsts_orig_sorted = [x for _, x in sorted(zip(temp_fcsts, temp_fcsts_orig))]
                    temp_fcsts.sort()
                    per_mvdb[mvdb][model]['fcsts'] = map(str, temp_fcsts)
                    per_mvdb[mvdb][model]['fcst_orig'] = map(str, temp_fcsts_orig_sorted)

                    print("\nStoring metadata for model " + model)
                    self.update_model_in_metadata_table(mvdb, model, per_mvdb[mvdb][model])
                else:
                    print("\nNo valid metadata for model " + model)

            self.update_groups(mvdb)

        # Print full metadata object
        # print(json.dumps(per_mvdb, sort_keys=True, indent=4))

    def update_model_in_metadata_table(self, mvdb, model, raw_metadata):
        # Make sure there's a row for each model/db combo
        self.cursor.execute("use mats_metadata;")
        self.cnx.commit()

        # See if the db/model have previous metadata
        self.cursor.execute("select * from upperair_mats_metadata where db = '" + mvdb + "' and model = '" + model + "';")

        if len(raw_metadata['regions']) > int(0) and len(raw_metadata['levels']) and len(raw_metadata['fcsts']) and len(
                raw_metadata['variables']) > int(0):
            qd = []
            updated_utc = datetime.utcnow().strftime('%s')
            mindate = datetime.strptime(raw_metadata['mindate'], '%Y-%m-%d %H:%M:%S')
            mindate = mindate.strftime('%s')
            maxdate = datetime.strptime(raw_metadata['maxdate'], '%Y-%m-%d %H:%M:%S')
            maxdate = maxdate.strftime('%s')
            display_text = model.replace('.', '_')
            if self.cursor.rowcount == 0:
                update_statement = "insert into upperair_mats_metadata_dev (db, model, display_text, regions, levels, fcst_lens, variables, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
                qd.append(mvdb)
                qd.append(model)
                qd.append(display_text)
            else:
                update_statement = "update upperair_mats_metadata_dev set regions = %s, levels = %s, fcst_lens = %s, variables = %s, fcst_orig = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s where db = '" + mvdb + "' and model = '" + model + "';"
            qd.append(str(raw_metadata['regions']))
            qd.append(str(raw_metadata['levels']))
            qd.append(str(raw_metadata['fcsts']))
            qd.append(str(raw_metadata['variables']))
            qd.append(str(raw_metadata['fcst_orig']))
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(raw_metadata['numrecs'])
            qd.append(updated_utc)
            self.cursor.execute(update_statement, qd)
            self.cnx.commit()

    def update_groups(self, mvdb):
        # get mvdb group
        get_group = 'select category from metadata'
        self.cursor.execute(get_group)
        if self.cursor.rowcount > 0:
            for row in self.cursor:
                group = row.values()[0]
        else:
            group = "NO GROUP"

        # see if this mvdb is already in this group. If not, add it.
        self.cursor.execute("use mats_metadata;")
        self.cnx.commit()
        get_current_dbs_in_group = "select dbs from upperair_database_groups_dev where db_group = '" + group + "';"
        self.cursor.execute(get_current_dbs_in_group)
        if self.cursor.rowcount > 0:
            update_needed = True
            for row in self.cursor:
                current_dbs = row.values()[0].strip('[]')
                current_dbs = [x.replace(" ", "").strip("'") for x in current_dbs.split(',')]
                if mvdb not in current_dbs:
                    current_dbs.append(mvdb)
        else:
            update_needed = False
            current_dbs = [mvdb]

        # store the new group info
        if update_needed:
            update_group = 'update upperair_database_groups_dev set dbs = "' + str(current_dbs) + '" where db_group = "' + group + '";'
            self.cursor.execute(update_group)
            self.cnx.commit()
        else:
            insert_group = 'insert into upperair_database_groups_dev (db_group, dbs) values("' + str(group) + '", "' + str(current_dbs) + '");'
            self.cursor.execute(insert_group)
            self.cnx.commit()

    # makes sure all expected options were indeed passed in
    def validate_options(self, options):
         assert True, options.cnf_file != None and options.db_model_input != None and options.refresh_urls != None

    def set_running(self,state):
        self.cursor.execute("select app_reference from mats_metadata.metadata_script_info where app_reference = '" + self.get_app_reference() + "'")
        self.cnx.commit()
        if self.cursor.rowcount == 0:
            #insert
            insert_cmd = 'INSERT INTO mats_metadata.metadata_script_info (apref,  running) VALUES ("' + self.get_app_reference() + '", "' + state  + '";'
            self.cursor.execute(insert_cmd)
            self.cnx.commit()
        else:
            #update
            update_cmd = 'update mats_metadata.metadata_script_info set state = "' + state + '" where app_reference = "' + self.get_app_reference() + '";'
            self.cursor.execute(update_cmd)
            self.cnx.commit()


    def update(self):
        db_model_input = self.db_model_input
        utc_now = str(datetime.now())
        print('UPPERAIR MATS FOR MET UPDATE METADATA START: ' + utc_now)
        set_running(true)
        self.build_stats_object()
        self.update_tables_and_close_cnx()
        for url in refresh_urls:
            urllib.request.urlopen(url, data=None, cafile=None, capath=None, cadefault=False, context=None)
        utc_now = str(datetime.now())
        print('UPPERAIR MATS FOR MET UPDATE METADATA END: ' + utc_now)
        set_running(false)
        return 0

    # process 'c' style options - using getopt - usage describes options
    # options like {'cnf_file':cnf_file, 'db_model_input':db_model_input, 'refresh_urls':refresh_urls}
    # cnf_file - mysql cnf file, db_model_input - comma-separated list of db/model pairs, refresh_urls - list of refresh_urls
    def get_options(self, args):
        usage = ["(c)nf_file=", "(d)=b_model_input", "(r)=efresh_urls"]
        cnf_file = None
        db_model_input= None
        refresh_urls = None

        try:
            opts, args = getopt.getopt(args[1:], "c:d:r", usage)
        except getopt.GetoptError as err:
            # print help information and exit:
            print(str(err))  # will print something like "option -a not recognized"
            print(usage)  # print usage from last param to getopt
            sys.exit(2)
        for o, a in opts:
            if o == "-?":
                print(usage)
                sys.exit(2)
            if o == "-c":
                cnf_file = a
            elif o == "-d":
                db_model_input = a.split(",")
            elif o == "-r":
                refresh_urls = a.split(",")
            else:
                assert False, "unhandled option"
        # make sure none were left out...
        assert True, cnf_file != None and db_model_input != None and refresh_urls != None
        options = {'cnf_file':cnf_file, 'db_model_input':db_model_input, 'refresh_urls':refresh_urls}
        validate_options(options)
        return options

if __name__ == '__main__':
    updater = UpdateMEUpperair(get_options(sys.argv))
    ret = updater.update()
    sys.exit(ret)
