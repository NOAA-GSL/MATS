#!/usr/bin/env python

from __future__ import print_function
import sys
import MySQLdb
import json
from datetime import datetime


def empty_dev_table():
    try:
        cnx = MySQLdb.connect(read_default_file="/home/amb-verif/hamilton/gsd_met_admin_my.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    print("Deleting from metadata dev table")
    cursor.execute("use mats_metadata;")
    cursor.execute("delete from ensemble_mats_metadata_dev;")
    cnx.commit()

    cursor.close()
    cnx.close()


def deploy_dev_table():
    try:
        cnx = MySQLdb.connect(read_default_file="/home/amb-verif/hamilton/gsd_met_admin_my.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    print("Deploying metadata dev table to production")
    cursor.execute("use mats_metadata;")
    cursor.execute("delete from ensemble_mats_metadata;")
    cnx.commit()
    cursor.execute("insert into ensemble_mats_metadata select * from ensemble_mats_metadata_dev;")
    cnx.commit()

    cursor.close()
    cnx.close()


def strip_level(elem):
    # helper function for sorting levels
    if elem[0] == 'Z':
        return int(elem[1:])
    else:
        return elem


def build_stats_object():
    # Open three connections to the database
    try:
        cnx = MySQLdb.connect(read_default_file="/home/amb-verif/hamilton/gsd_met_admin_my.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    try:
        cnx2 = MySQLdb.connect(read_default_file="/home/amb-verif/hamilton/gsd_met_admin_my.cnf")
        cnx2.autocommit = True
        cursor2 = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    try:
        cnx3 = MySQLdb.connect(read_default_file="/home/amb-verif/hamilton/gsd_met_admin_my.cnf")
        cnx3.autocommit = True
        cursor3 = cnx3.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    # Get list of databases here
    show_mvdbs = 'show databases like "mv_%";'
    cursor.execute(show_mvdbs)
    mvdbs = []
    for line in cursor:
        mvdbs.append(line.values()[0])

    # Find the metadata for each database
    per_mvdb = {}
    for mvdb in mvdbs:
        per_mvdb[mvdb] = {}
        use_db = "use " + mvdb
        cursor.execute(use_db)
        print("\n\nUsing db " + mvdb)

        # Get the models in this database
        get_models = 'select distinct model from stat_header where fcst_var like "PROB%";'
        cursor.execute(get_models)
        for line in cursor:
            model = line.values()[0]
            per_mvdb[mvdb][model] = {}
            print("\nProcessing model " + model)

            # Get the regions for this model in this database
            get_regions = 'select distinct vx_mask from stat_header where fcst_var like "PROB%" and model ="' + model + '";'
            per_mvdb[mvdb][model]['regions'] = []
            print("Getting regions for model " + model)
            cursor2.execute(get_regions)
            for line2 in cursor2:
                region = line2.values()[0]
                per_mvdb[mvdb][model]['regions'].append(region)
            per_mvdb[mvdb][model]['regions'].sort()

            # Get the levels for this model in this database
            get_levels = 'select distinct fcst_lev from stat_header where fcst_var like "PROB%" and model ="' + model + '";'
            per_mvdb[mvdb][model]['levels'] = []
            print("Getting levels for model " + model)
            cursor2.execute(get_levels)
            for line2 in cursor2:
                level = line2.values()[0]
                per_mvdb[mvdb][model]['levels'].append(level)
            per_mvdb[mvdb][model]['levels'].sort(key=strip_level)

            # Get the ensemble variables for this model in this database
            get_vars = 'select distinct fcst_var from stat_header where fcst_var like "PROB%" and model ="' + model + '";'
            per_mvdb[mvdb][model]['variables'] = []
            print("Getting variables for model " + model)
            cursor2.execute(get_vars)
            for line2 in cursor2:
                variable = line2.values()[0]
                per_mvdb[mvdb][model]['variables'].append(variable)
            per_mvdb[mvdb][model]['variables'].sort()

            # Get the fcst lead times for this model in this database
            get_fcsts = 'select distinct ld.fcst_lead ' \
                        'from stat_header h, line_data_pct ld ' \
                        'where h.model ="' + model + '" ' \
                        'and h.fcst_var like "PROB%" ' \
                        'and ld.stat_header_id = h.stat_header_id;'
            temp_fcsts = []
            temp_fcsts_orig = []
            print("Getting fcst lens for model " + model)
            cursor2.execute(get_fcsts)
            for line2 in cursor2:
                fcst = int(line2.values()[0])
                if fcst % 10000 == 0:
                    temp_fcsts_orig.append(fcst)
                    fcst = fcst/10000
                else:
                    temp_fcsts_orig.append(fcst)
                temp_fcsts.append(fcst)
            temp_fcsts_orig_sorted = [x for _, x in sorted(zip(temp_fcsts, temp_fcsts_orig))]
            temp_fcsts.sort()
            per_mvdb[mvdb][model]['fcsts'] = map(str, temp_fcsts)
            per_mvdb[mvdb][model]['fcst_orig'] = map(str, temp_fcsts_orig_sorted)

            # Get the stats for this model in this database
            get_stats = 'select max(ld.fcst_valid_beg) as maxdate, min(ld.fcst_valid_beg) as mindate, count(ld.fcst_valid_beg) as numrecs ' \
                        'from stat_header h, line_data_pct ld ' \
                        'where h.model ="' + model + '" ' \
                        'and h.fcst_var like "PROB%" ' \
                        'and ld.stat_header_id = h.stat_header_id;'
            print("Getting stats for model " + model)
            cursor2.execute(get_stats)
            for line2 in cursor2:
                line2keys = line2.keys()
                for line2key in line2keys:
                    val = str(line2[line2key])
                    per_mvdb[mvdb][model][line2key] = val

            # Add the info for this model to the metadata table
            if int(per_mvdb[mvdb][model]['numrecs']) > int(0):
                print("\nStoring metadata for model " + model)
                add_model_to_metadata_table(cnx3, cursor3, mvdb, model, per_mvdb[mvdb][model])
            else:
                print("\nNo valid metadata for model " + model)

    # Print full metadata object
    print(json.dumps(per_mvdb, sort_keys=True, indent=4))

    try:
        cursor.close()
        cnx.close()
    except MySQLdb.Error as e:
        print("Error closing 1st cursor: " + str(e))

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


def add_model_to_metadata_table(cnx, cursor, mvdb, model, raw_metadata):
    # Add a row for each model/db combo
    cursor.execute("use mats_metadata;")

    if len(raw_metadata['regions']) > int(0) and len(raw_metadata['levels']) and len(raw_metadata['fcsts']) and len(raw_metadata['variables']) > int(0):
        qd = []
        updated_utc = datetime.utcnow().strftime('%s')
        mindate = datetime.strptime(raw_metadata['mindate'], '%Y-%m-%d %H:%M:%S')
        mindate = mindate.strftime('%s')
        maxdate = datetime.strptime(raw_metadata['maxdate'], '%Y-%m-%d %H:%M:%S')
        maxdate = maxdate.strftime('%s')
        display_text = model.replace('.', '_')
        insert_row = "insert into ensemble_mats_metadata_dev (db, model, display_text, regions, levels, fcst_lens, variables, fcst_orig, mindate, maxdate, numrecs, updated) values(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
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


def main():
    empty_dev_table()
    build_stats_object()
    deploy_dev_table()


if __name__ == '__main__':

    if len(sys.argv) == 2:
        if sys.argv[1] == 'deploy':
            utc_now = str(datetime.now())
            msg = 'ENSEMBLE MATS FOR MET METADATA START: ' + utc_now
            print(msg)
            main()
            utc_now = str(datetime.now())
            msg = 'ENSEMBLE MATS FOR MET METADATA END: ' + utc_now
            print(msg)
