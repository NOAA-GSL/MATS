#!/usr/bin/env python
#
# Creates a regions_per_model_mats_all_categories table for all models in ruc_ua_sums2 AND acars_RR

# __future__ must come first
from __future__ import print_function
from datetime import datetime

import re
import sys
import ast
import MySQLdb


############################################################################

def update_rpm_record(cnx, cursor, upperair_model, aircraft_model, display_text, table_name_prefix, regions, fcst_lens, truths, display_category, display_order, mindate, maxdate, numrecs):

    # see if this record already exists (it shouldn't, because this script cleaned the tables when it started)
    find_rpm_rec = "SELECT id FROM regions_per_model_mats_all_categories_build WHERE display_text = '" + str(display_text) + "'"
    cursor.execute(find_rpm_rec)
    record_id = int(0)
    for row in cursor:
        val = row.values()[0]
        record_id = int(val)

    if len(regions) > int(0) and len(fcst_lens) > int(0):
        qd = []
        updated_utc = datetime.utcnow().strftime('%s')
        # if it's a new record (it should be) add it
        if record_id == 0:
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories_build (upperair_model, aircraft_model, display_text, table_name_prefix, regions, fcst_lens, truths, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd.append(str(upperair_model))
            qd.append(str(aircraft_model))
            qd.append(str(display_text))
            qd.append(str(table_name_prefix))
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(truths))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(record_id)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            cursor.execute(insert_rpm_rec, qd)
            cnx.commit()
        else:
            # if there's a pre-existing record, update it
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories_build SET regions = %s, fcst_lens = %s, truths = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(truths))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            qd.append(record_id)
            cursor.execute(update_rpm_rec, qd)
            cnx.commit()


############################################################################

def regions_per_model_mats_all_categories(mode):
    # connect to database
    try:
        cnx = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")  # location of cnf file on Hera; edit if running locally
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute("set session wait_timeout=28800")
        cursor.execute("set session interactive_timeout=28800")
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    try:
        cnx2 = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")  # location of cnf file on Hera; edit if running locally
        cnx2.autocommit = True
        cursor2 = cnx2.cursor(MySQLdb.cursors.DictCursor)
        cursor2.execute("set session wait_timeout=28800")
        cursor2.execute("set session interactive_timeout=28800")
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    db = "acars_RR2"
    usedb = "use " + db
    cursor.execute(usedb)

    db2 = "ruc_ua_sums2"
    usedb2 = "use " + db2
    cursor2.execute(usedb2)

    # get all metadata for the aircraft app
    aircraft_metadata_query = "select * from regions_per_model_mats_all_categories;"
    cursor.execute(aircraft_metadata_query)
    aircraft_metadata = {}
    for row in cursor:
        display_text = row['display_text']
        aircraft_metadata[display_text] = {}
        aircraft_metadata[display_text]['model'] = row['model']
        aircraft_metadata[display_text]['regions'] = row['regions'].strip("[]").split(", ")
        aircraft_metadata[display_text]['fcst_lens'] = row['fcst_lens'].strip("[]").split(", ")
        aircraft_metadata[display_text]['display_category'] = row['display_category']
        aircraft_metadata[display_text]['display_order'] = row['display_order']
        aircraft_metadata[display_text]['mindate'] = row['mindate']
        aircraft_metadata[display_text]['maxdate'] = row['maxdate']
        aircraft_metadata[display_text]['numrecs'] = row['numrecs']
    all_aircraft_models = aircraft_metadata.keys()

    # get all metadata for the upperair app
    db = "ruc_ua"
    usedb = "use " + db
    cursor.execute(usedb)

    upperair_metadata_query = "select * from regions_per_model_mats_all_categories;"
    cursor.execute(upperair_metadata_query)
    upperair_metadata = {}
    for row in cursor:
        display_text = row['display_text']
        upperair_metadata[display_text] = {}
        upperair_metadata[display_text]['model'] = row['model']
        upperair_metadata[display_text]['table_name_prefix'] = row['table_name_prefix']
        upperair_metadata[display_text]['regions'] = row['regions'].strip("[]").split(", ")
        upperair_metadata[display_text]['fcst_lens'] = row['fcst_lens'].strip("[]").split(", ")
        upperair_metadata[display_text]['display_category'] = row['display_category']
        upperair_metadata[display_text]['display_order'] = row['display_order']
        upperair_metadata[display_text]['mindate'] = row['mindate']
        upperair_metadata[display_text]['maxdate'] = row['maxdate']
        upperair_metadata[display_text]['minhour'] = row['minhour']
        upperair_metadata[display_text]['maxhour'] = row['maxhour']
        upperair_metadata[display_text]['numrecs'] = row['numrecs']
    all_upperair_models = upperair_metadata.keys()

    # combine metadata objects
    combined_metadata = {}
    for display_text in all_upperair_models:
        model_exists_in_aircraft = display_text in all_aircraft_models
        combined_metadata[display_text] = {}
        combined_metadata[display_text]['upperair_model'] = upperair_metadata[display_text]['model']
        combined_metadata[display_text]['table_name_prefix'] = upperair_metadata[display_text]['table_name_prefix']
        combined_metadata[display_text]['display_category'] = upperair_metadata[display_text]['display_category']
        combined_metadata[display_text]['display_order'] = upperair_metadata[display_text]['display_order']
        combined_metadata[display_text]['mindate'] = upperair_metadata[display_text]['mindate']
        combined_metadata[display_text]['maxdate'] = upperair_metadata[display_text]['maxdate']
        if model_exists_in_aircraft:
            combined_metadata[display_text]['aircraft_model'] = aircraft_metadata[display_text]['model']
            combined_metadata[display_text]['regions'] = list(set(upperair_metadata[display_text]['regions']) | set(aircraft_metadata[display_text]['regions']))
            combined_metadata[display_text]['fcst_lens'] = list(set(upperair_metadata[display_text]['fcst_lens']) | set(aircraft_metadata[display_text]['fcst_lens']))
            combined_metadata[display_text]['truths'] = ['RAOB', 'AMDAR']
            combined_metadata[display_text]['numrecs'] = int(upperair_metadata[display_text]['numrecs']) + int(aircraft_metadata[display_text]['numrecs'])
            all_aircraft_models.pop()
        else:
            combined_metadata[display_text]['aircraft_model'] = ""
            combined_metadata[display_text]['regions'] = upperair_metadata[display_text]['regions']
            combined_metadata[display_text]['fcst_lens'] = upperair_metadata[display_text]['fcst_lens']
            combined_metadata[display_text]['truths'] = ['RAOBs']
            combined_metadata[display_text]['numrecs'] = upperair_metadata[display_text]['numrecs']
        update_rpm_record(cnx2, cursor2, combined_metadata[display_text]['upperair_model'], combined_metadata[display_text]['aircraft_model'],
                          display_text, combined_metadata[display_text]['table_name_prefix'], combined_metadata[display_text]['regions'],
                          combined_metadata[display_text]['fcst_lens'], combined_metadata[display_text]['truths'],
                          combined_metadata[display_text]['display_category'], combined_metadata[display_text]['display_order'],
                          combined_metadata[display_text]['mindate'], combined_metadata[display_text]['maxdate'], combined_metadata[display_text]['numrecs'])

    for display_text in all_aircraft_models:
        combined_metadata[display_text] = {}
        combined_metadata[display_text]['upperair_model'] = ""
        combined_metadata[display_text]['aircraft_model'] = aircraft_metadata[display_text]['model']
        combined_metadata[display_text]['table_name_prefix'] = ""
        combined_metadata[display_text]['regions'] = aircraft_metadata[display_text]['regions']
        combined_metadata[display_text]['fcst_lens'] = aircraft_metadata[display_text]['fcst_lens']
        combined_metadata[display_text]['truths'] = ['AMDAR']
        combined_metadata[display_text]['display_category'] = aircraft_metadata[display_text]['display_category']
        combined_metadata[display_text]['display_order'] = aircraft_metadata[display_text]['display_order']
        combined_metadata[display_text]['mindate'] = aircraft_metadata[display_text]['mindate']
        combined_metadata[display_text]['maxdate'] = aircraft_metadata[display_text]['maxdate']
        combined_metadata[display_text]['numrecs'] = aircraft_metadata[display_text]['numrecs']
        update_rpm_record(cnx2, cursor2, combined_metadata[display_text]['upperair_model'], combined_metadata[display_text]['aircraft_model'],
                          display_text, combined_metadata[display_text]['table_name_prefix'], combined_metadata[display_text]['regions'],
                          combined_metadata[display_text]['fcst_lens'], combined_metadata[display_text]['truths'],
                          combined_metadata[display_text]['display_category'], combined_metadata[display_text]['display_order'],
                          combined_metadata[display_text]['mindate'], combined_metadata[display_text]['maxdate'], combined_metadata[display_text]['numrecs'])

    # clean metadata publication table and add the build data into it
    updated_utc = datetime.utcnow().strftime('%Y/%m/%d %H:%M')
    if 'deploy' in mode:
        clean_rpmmac = "delete from regions_per_model_mats_all_categories"
        cursor.execute(clean_rpmmac)
        cnx.commit()
        set_ai = "alter table regions_per_model_mats_all_categories auto_increment = 1"
        cursor.execute(set_ai)
        cnx.commit()
        sync_rpm = "insert into regions_per_model_mats_all_categories select * from regions_per_model_mats_all_categories_build"
        cursor.execute(sync_rpm)
        cnx.commit()
        print("deploy " + db2 + ".regions_per_model_mats_all_categories complete at " + str(updated_utc))
    else:
        print("skipping deployment at " + str(updated_utc))

    cursor.close()
    cnx.close()


#####################   regions_per_model_mats_all_categories   ####################################

if __name__ == '__main__':
    def selftest(mode):
        regions_per_model_mats_all_categories(mode)

    if len(sys.argv) == 2:
        if sys.argv[1] == 'selftest':
            selftest('selftest')

    if len(sys.argv) == 2:
        if sys.argv[1] == 'deploy':
            utcnow = str(datetime.now())
            msg = 'UPPER AIR COMBINED MATS METADATA START: ' + utcnow
            print(msg)
            regions_per_model_mats_all_categories('deploy')
            utcnow = str(datetime.now())
            msg = 'UPPER AIR COMBINED MATS METADATA END: ' + utcnow
            print(msg)
