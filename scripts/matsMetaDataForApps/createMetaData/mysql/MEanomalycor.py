#!/usr/bin/env python
"""
This script creates the metadata tables required for a METexpress anomaly correlation app. It parses the required fields from any
databases that begin with 'mv_' in a mysql instance.

Arguments: path to a mysql .cnf file

Usage: ./MEanomalycor.py path_to_file.cnf

Author: Molly B Smith
"""

from __future__ import print_function
import sys
import os.path
import MySQLdb
import json
from datetime import datetime


def mysql_prep_tables():
    try:
        cnx = MySQLdb.connect(read_default_file=cnf_file)
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    # adjust timeouts
    cursor.execute('SET GLOBAL connect_timeout=28800')
    cnx.commit()
    cursor.execute('SET GLOBAL wait_timeout=28800')
    cnx.commit()
    cursor.execute('SET GLOBAL interactive_timeout=28800')
    cnx.commit()

    # see if the metadata database already exists
    print("Checking for mats_metadata db")
    cursor.execute('show databases like "mats_metadata";')
    cnx.commit()
    if cursor.rowcount == 0:
        create_db_query = 'create database mats_metadata;'
        cursor.execute(create_db_query)
        cnx.commit()

    cursor.execute("use mats_metadata;")
    cnx.commit()

    # see if the metadata tables already exist
    print("Checking for anomalycor metadata tables")
    cursor.execute('show tables like "anomalycor_mats_metadata_dev";')
    cnx.commit()
    if cursor.rowcount == 0:
        print("Metadata dev table does not exist--creating it")
        create_table_query = 'create table anomalycor_mats_metadata_dev (db varchar(255), model varchar(255), display_text varchar(255), regions varchar(1023), levels varchar(1023), fcst_lens varchar(1023), variables varchar(1023), fcst_orig varchar(1023), mindate int(11), maxdate int(11), numrecs int(11), updated int(11));'
        cursor.execute(create_table_query)
        cnx.commit()
    cursor.execute('show tables like "anomalycor_mats_metadata";')
    cnx.commit()
    if cursor.rowcount == 0:
        print("Metadata prod table does not exist--creating it")
        create_table_query = 'create table anomalycor_mats_metadata like anomalycor_mats_metadata_dev;'
        cursor.execute(create_table_query)
        cnx.commit()

    print("Deleting from metadata dev table")
    cursor.execute("delete from anomalycor_mats_metadata_dev;")
    cnx.commit()

    # see if the metadata group tables already exist
    cursor.execute('show tables like "anomalycor_database_groups_dev";')
    if cursor.rowcount == 0:
        print("Database group dev table does not exist--creating it")
        create_table_query = 'create table anomalycor_database_groups_dev (db_group varchar(255), dbs varchar(32767));'
        cursor.execute(create_table_query)
        cnx.commit()
    cursor.execute('show tables like "anomalycor_database_groups";')
    if cursor.rowcount == 0:
        print("Database group prod table does not exist--creating it")
        create_table_query = 'create table anomalycor_database_groups like anomalycor_database_groups_dev;'
        cursor.execute(create_table_query)
        cnx.commit()

    print("Deleting from group dev table")
    cursor.execute("delete from anomalycor_database_groups_dev;")
    cnx.commit()

    return cnx, cursor


def deploy_dev_table_and_close_cnx(cnx, cursor):
    print("Publishing metadata")
    cursor.execute("use mats_metadata;")
    cnx.commit()
    cursor.execute("delete from anomalycor_mats_metadata;")
    cnx.commit()
    cursor.execute("insert into anomalycor_mats_metadata select * from anomalycor_mats_metadata_dev;")
    cnx.commit()
    cursor.execute("delete from anomalycor_database_groups;")
    cnx.commit()
    cursor.execute("insert into anomalycor_database_groups select * from anomalycor_database_groups_dev;")
    cnx.commit()

    cursor.close()
    cnx.close()


def strip_level(elem):
    # helper function for sorting levels
    if elem[0] in ['P', 'Z', 'H', 'L']:
        if '-' not in elem:
            return int(elem[1:])
        else:
            hyphen_idx = elem.find('-')
            return int(elem[1:hyphen_idx])
    else:
        return elem


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
    try:
        cnx3 = MySQLdb.connect(read_default_file=cnf_file)
        cnx3.autocommit = True
        cursor3 = cnx3.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    # adjust timeouts
    cursor2.execute('SET GLOBAL connect_timeout=28800')
    cnx2.commit()
    cursor2.execute('SET GLOBAL wait_timeout=28800')
    cnx2.commit()
    cursor2.execute('SET GLOBAL interactive_timeout=28800')
    cnx2.commit()

    cursor3.execute('SET GLOBAL connect_timeout=28800')
    cnx3.commit()
    cursor3.execute('SET GLOBAL wait_timeout=28800')
    cnx3.commit()
    cursor3.execute('SET GLOBAL interactive_timeout=28800')
    cnx3.commit()

    # Get list of databases here
    show_mvdbs = 'show databases like "mv_%";'
    cursor.execute(show_mvdbs)
    cnx.commit()
    mvdbs = []
    for line in cursor:
        mvdbs.append(line.values()[0])

    # Find the metadata for each database
    per_mvdb = {}
    db_groups = {}
    for mvdb in mvdbs:
        per_mvdb[mvdb] = {}
        db_has_valid_data = False
        use_db = "use " + mvdb
        cursor.execute(use_db)
        cursor2.execute(use_db)
        cnx.commit()
        print("\n\nUsing db " + mvdb)

        # Get the models in this database
        get_models = 'select distinct model from stat_header;'
        cursor.execute(get_models)
        cnx.commit()
        for line in cursor:
            model = line.values()[0]
            per_mvdb[mvdb][model] = {}
            print("\nProcessing model " + model)

            # Get the regions for this model in this database
            get_regions = 'select distinct vx_mask from stat_header where model ="' + model + '";'
            per_mvdb[mvdb][model]['regions'] = []
            print("Getting regions for model " + model)
            cursor2.execute(get_regions)
            cnx2.commit()
            for line2 in cursor2:
                region = line2.values()[0]
                per_mvdb[mvdb][model]['regions'].append(region)
            per_mvdb[mvdb][model]['regions'].sort()

            # Get the levels for this model in this database
            get_levels = 'select distinct fcst_lev from stat_header where model ="' + model + '";'
            per_mvdb[mvdb][model]['levels'] = []
            print("Getting levels for model " + model)
            cursor2.execute(get_levels)
            cnx2.commit()
            for line2 in cursor2:
                level = line2.values()[0]
                per_mvdb[mvdb][model]['levels'].append(level)
            per_mvdb[mvdb][model]['levels'].sort(key=strip_level)

            # Get the ACC variables for this model in this database
            get_vars = 'select distinct fcst_var from stat_header where model ="' + model + '";'
            per_mvdb[mvdb][model]['variables'] = []
            print("Getting variables for model " + model)
            cursor2.execute(get_vars)
            cnx2.commit()
            for line2 in cursor2:
                variable = line2.values()[0]
                per_mvdb[mvdb][model]['variables'].append(variable)
            per_mvdb[mvdb][model]['variables'].sort()

            # Get the fcst lead times for this model in this database
            get_fcsts = 'select distinct ld.fcst_lead ' \
                        'from stat_header h, line_data_sal1l2 ld ' \
                        'where h.model ="' + model + '" ' \
                        'and ld.stat_header_id = h.stat_header_id;'
            temp_fcsts = []
            temp_fcsts_orig = []
            print("Getting fcst lens for model " + model)
            cursor2.execute(get_fcsts)
            cnx2.commit()
            for line2 in cursor2:
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

            # Get the stats for this model in this database
            get_stats = 'select max(ld.fcst_valid_beg) as maxdate, min(ld.fcst_valid_beg) as mindate, count(ld.fcst_valid_beg) as numrecs ' \
                        'from stat_header h, line_data_sal1l2 ld ' \
                        'where h.model ="' + model + '" ' \
                        'and ld.stat_header_id = h.stat_header_id;'
            print("Getting stats for model " + model)
            cursor2.execute(get_stats)
            cnx2.commit()
            for line2 in cursor2:
                line2keys = line2.keys()
                for line2key in line2keys:
                    val = str(line2[line2key])
                    per_mvdb[mvdb][model][line2key] = val

            # Add the info for this model to the metadata table
            if int(per_mvdb[mvdb][model]['numrecs']) > int(0):
                db_has_valid_data = True
                print("\nStoring metadata for model " + model)
                add_model_to_metadata_table(cnx3, cursor3, mvdb, model, per_mvdb[mvdb][model])
            else:
                print("\nNo valid metadata for model " + model)

        # Get the group(s) this db is in
        if db_has_valid_data:
            get_groups = 'select category from metadata'
            cursor.execute(get_groups)
            if cursor.rowcount > 0:
                for line in cursor:
                    group = line.values()[0]
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

    try:
        cursor3.close()
        cnx3.close()
    except MySQLdb.Error as e:
        print("Error closing 3rd cursor: " + str(e))

    return cnx, cursor


def add_model_to_metadata_table(cnx, cursor, mvdb, model, raw_metadata):
    # Add a row for each model/db combo
    cursor.execute("use mats_metadata;")
    cnx.commit()

    if len(raw_metadata['regions']) > int(0) and len(raw_metadata['levels']) and len(raw_metadata['fcsts']) and len(
            raw_metadata['variables']) > int(0):
        qd = []
        updated_utc = datetime.utcnow().strftime('%s')
        mindate = datetime.strptime(raw_metadata['mindate'], '%Y-%m-%d %H:%M:%S')
        mindate = mindate.strftime('%s')
        maxdate = datetime.strptime(raw_metadata['maxdate'], '%Y-%m-%d %H:%M:%S')
        maxdate = maxdate.strftime('%s')
        display_text = model.replace('.', '_')
        insert_row = "insert into anomalycor_mats_metadata_dev (db, model, display_text, regions, levels, fcst_lens, variables, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
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
        cursor.execute(insert_row, qd)
        cnx.commit()


def populate_db_group_tables(cnx, cursor, db_groups):
    cursor.execute("use mats_metadata;")
    cnx.commit()
    for group in db_groups:
        qd = []
        insert_row = "insert into anomalycor_database_groups_dev (db_group, dbs) values(%s, %s)"
        qd.append(group)
        qd.append(str(db_groups[group]))
        cursor.execute(insert_row, qd)
        cnx.commit()


def main():
    cnx, cursor = mysql_prep_tables()
    cnx, cursor = build_stats_object(cnx, cursor)
    deploy_dev_table_and_close_cnx(cnx, cursor)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Error -- mysql cnf file needs to be passed in as argument")
        sys.exit(1)
    elif len(sys.argv) == 2:
        cnf_file = sys.argv[1]
        exists = os.path.isfile(cnf_file)
        if exists:
            print("using cnf file: " + cnf_file)
        else:
            print("cnf file " + cnf_file + " is not a file - exiting")
            sys.exit(1)
    utc_now = str(datetime.now())
    msg = 'ANOMALYCOR MATS FOR MET METADATA START: ' + utc_now
    print(msg)
    main()
    utc_now = str(datetime.now())
    msg = 'ANOMALYCOR MATS FOR MET METADATA END: ' + utc_now
    print(msg)
    sys.exit(0)
