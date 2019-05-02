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
import MySQLdb
import json
from datetime import datetime


def mysql_connect_and_check_tables():
    try:
        cnx = MySQLdb.connect(read_default_file=cnf_file)
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)


    # see if the metadata database already exists
    print("Checking for mats_metadata db")
    cursor.execute('show databases like "mats_metadata";')
    cnx.commit()
    if cursor.rowcount == 0:
        print("mats_metadata db does not exist. Run MEupperair.py to initialize it.")
        sys.exit(1)

    cursor.execute("use mats_metadata;")
    cnx.commit()

    # see if the metadata tables already exist
    print("Checking for upperair metadata tables")
    cursor.execute('show tables like "upperair_mats_metadata_dev";')
    cnx.commit()
    if cursor.rowcount == 0:
        print("upperair metadata table does not exist. Run MEupperair.py to initialize it.")
        sys.exit(1)
    cursor.execute('show tables like "upperair_mats_metadata";')
    cnx.commit()
    if cursor.rowcount == 0:
        print("upperair metadata table does not exist. Run MEupperair.py to initialize it.")
        sys.exit(1)

    # see if the metadata group tables already exist
    cursor.execute('show tables like "upperair_database_groups_dev";')
    if cursor.rowcount == 0:
        print("upperair groups table does not exist. Run MEupperair.py to initialize it.")
        sys.exit(1)
    cursor.execute('show tables like "upperair_database_groups";')
    if cursor.rowcount == 0:
        print("upperair groups table does not exist. Run MEupperair.py to initialize it.")
        sys.exit(1)

    return cnx, cursor


def update_tables_and_close_cnx(cnx, cursor):
    print("Publishing metadata")
    cursor.execute("use mats_metadata;")
    cnx.commit()
    cursor.execute("delete from upperair_mats_metadata;")
    cnx.commit()
    cursor.execute("insert into upperair_mats_metadata select * from upperair_mats_metadata_dev;")
    cnx.commit()
    cursor.execute("delete from upperair_database_groups;")
    cnx.commit()
    cursor.execute("insert into upperair_database_groups select * from upperair_database_groups_dev;")
    cnx.commit()

    cursor.close()
    cnx.close()


def strip_level(elem):
    # helper function for sorting levels
    if '-' not in elem:
        return int(elem[1:])
    else:
        hyphen_idx = elem.find('-')
        return int(elem[1:hyphen_idx])


def build_stats_object(cnx, cursor):
    print("Compiling metadata")
    # Open two additional connections to the database
    try:
        cnx2 = MySQLdb.connect(read_default_file=cnf_file)
        cnx2.autocommit = True
        cursor2 = cnx2.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    # parse dbs and models to reprocess
    mvdbs = []
    mvdb_map = {}
    db_model_pairs = db_model_input.strip().split(',')
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
        cursor.execute(use_db)
        cnx.commit()
        print("\n\nUsing db " + mvdb)

        # Update models in this database
        for model in mvdb_map[mvdb]:
            per_mvdb[mvdb][model] = {}
            print("\nProcessing model " + model)

            # Get the stats for this model in this database
            get_stats = 'select max(ld.fcst_valid_beg) as maxdate, min(ld.fcst_valid_beg) as mindate, count(ld.fcst_valid_beg) as numrecs ' \
                        'from stat_header h, line_data_sl1l2 ld ' \
                        'where h.model ="' + model + '" ' \
                        'and h.fcst_lev like "P%" ' \
                        'and ld.stat_header_id = h.stat_header_id;'
            print("Getting stats for model " + model)
            cursor.execute(get_stats)
            cnx.commit()
            for line2 in cursor:
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
                cursor.execute(get_regions)
                cnx.commit()
                for line2 in cursor:
                    region = line2.values()[0]
                    per_mvdb[mvdb][model]['regions'].append(region)
                per_mvdb[mvdb][model]['regions'].sort()

                # Get the levels for this model in this database
                get_levels = 'select distinct fcst_lev from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                per_mvdb[mvdb][model]['levels'] = []
                print("Getting levels for model " + model)
                cursor.execute(get_levels)
                cnx.commit()
                for line2 in cursor:
                    level = line2.values()[0]
                    per_mvdb[mvdb][model]['levels'].append(level)
                per_mvdb[mvdb][model]['levels'].sort(key=strip_level)

                # Get the UA variables for this model in this database
                get_vars = 'select distinct fcst_var from stat_header where fcst_lev like "P%" and model ="' + model + '";'
                per_mvdb[mvdb][model]['variables'] = []
                print("Getting variables for model " + model)
                cursor.execute(get_vars)
                cnx.commit()
                for line2 in cursor:
                    variable = line2.values()[0]
                    per_mvdb[mvdb][model]['variables'].append(variable)
                per_mvdb[mvdb][model]['variables'].sort()

                # Get the fcst lead times for this model in this database
                get_fcsts = 'select distinct ld.fcst_lead ' \
                            'from stat_header h, line_data_sl1l2 ld ' \
                            'where h.model ="' + model + '" ' \
                            'and h.fcst_lev like "P%" ' \
                            'and ld.stat_header_id = h.stat_header_id;'
                temp_fcsts = []
                temp_fcsts_orig = []
                print("Getting fcst lens for model " + model)
                cursor.execute(get_fcsts)
                cnx.commit()
                for line2 in cursor:
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
                update_model_in_metadata_table(cnx2, cursor2, mvdb, model, per_mvdb[mvdb][model])
            else:
                print("\nNo valid metadata for model " + model)


    # Redo db groups
    show_mvdbs = 'show databases like "mv_%";'
    cursor.execute(show_mvdbs)
    cnx.commit()
    for line in cursor:
        mvdb = line.values()[0]
        use_db = "use " + mvdb
        cursor2.execute(use_db)
        cnx2.commit()
        get_groups = 'select category from metadata'
        cursor2.execute(get_groups)
        if cursor2.rowcount > 0:
            for row in cursor2:
                group = row.values()[0]
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
    populate_db_group_tables(cnx, cursor, db_groups)

    # Print full metadata object
    print(json.dumps(per_mvdb, sort_keys=True, indent=4))

    try:
        cursor2.close()
        cnx2.close()
    except MySQLdb.Error as e:
        print("Error closing 2nd cursor: " + str(e))

    return cnx, cursor


def update_model_in_metadata_table(cnx, cursor, mvdb, model, raw_metadata):
    # Make sure there's a row for each model/db combo
    cursor.execute("use mats_metadata;")
    cnx.commit()

    # See if the db/model have previous metadata
    cursor.execute("select * from upperair_mats_metadata where db = '" + mvdb + "' and model = '" + model + "';")

    if len(raw_metadata['regions']) > int(0) and len(raw_metadata['levels']) and len(raw_metadata['fcsts']) and len(
            raw_metadata['variables']) > int(0):
        qd = []
        updated_utc = datetime.utcnow().strftime('%s')
        mindate = datetime.strptime(raw_metadata['mindate'], '%Y-%m-%d %H:%M:%S')
        mindate = mindate.strftime('%s')
        maxdate = datetime.strptime(raw_metadata['maxdate'], '%Y-%m-%d %H:%M:%S')
        maxdate = maxdate.strftime('%s')
        display_text = model.replace('.', '_')
        if cursor.rowcount == 0:
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
        cursor.execute(update_statement, qd)
        cnx.commit()


def populate_db_group_tables(cnx, cursor, db_groups):
    cursor.execute("use mats_metadata;")
    cnx.commit()
    cursor.execute("delete from upperair_database_groups_dev;")
    cnx.commit()
    for group in db_groups:
        qd = []
        insert_row = "insert into upperair_database_groups_dev (db_group, dbs) values(%s, %s)"
        qd.append(group)
        qd.append(str(db_groups[group]))
        cursor.execute(insert_row, qd)
        cnx.commit()


def main():
    cnx, cursor = mysql_connect_and_check_tables()
    cnx, cursor = build_stats_object(cnx, cursor)
    update_tables_and_close_cnx(cnx, cursor)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Error -- need two arguments: mysql cnf file and comma-separated list of db/model pairs")
        sys.exit(1)
    else:
        cnf_file = sys.argv[1]
        exists = os.path.isfile(cnf_file)
        if exists:
            print("using cnf file: " + cnf_file)
        else:
            print("cnf file " + cnf_file + " is not a file - exiting")
            sys.exit(1)
        db_model_input = sys.argv[2]
    utc_now = str(datetime.now())
    msg = 'UPPERAIR MATS FOR MET UPDATE METADATA START: ' + utc_now
    print(msg)
    main()
    utc_now = str(datetime.now())
    msg = 'UPPERAIR MATS FOR MET UPDATE METADATA END: ' + utc_now
    print(msg)
    sys.exit(0)
