#!/usr/bin/env python
#
# Creates a regions_per_model_mats_all_categories table for all models in dmv

# __future__ must come first
from __future__ import print_function
from datetime import datetime

import re
import sys
import ast
import MySQLdb


############################################################################

def update_rpm_record(cnx, cursor, table_name, display_text, regions, fcst_lens, display_category, display_order, mindate, maxdate, numrecs):

    # see if this record already exists (it shouldn't, because this script cleaned the tables when it started)
    find_rpm_rec = "SELECT id FROM regions_per_model_mats_all_categories_build WHERE model = '" + str(table_name) + "'"
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
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories_build (model, display_text, regions, fcst_lens, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd.append(str(table_name))
            qd.append(str(display_text))
            qd.append(str(regions))
            qd.append(str(fcst_lens))
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
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories_build SET regions = %s, fcst_lens = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            qd.append(str(regions))
            qd.append(str(fcst_lens))
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
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    db = "dmv"
    usedb = "use " + db
    cursor.execute(usedb)

    # clean TABLESTATS_build in order to get updated data source information. If nothing has changed, you can set
    # TScleaned to False and just use the old data source info.
    clean_tablestats = "delete from " + db + ".TABLESTATS_build"
    # TScleaned = False
    TScleaned = True
    if TScleaned:
        cursor.execute(clean_tablestats)
        cnx.commit()
    else:
        print("NOT executing: " + str(clean_tablestats))

    # string of tables not to include in our search for metadata
    skiptables = "regions_per_model_mats_all_categories regions_per_model_mats_all_categories_dev regions_per_model_mats_all_categories_build template_LIDAR template_MWR TABLESTATS_build station_metadata"

    # get an array of all relevant data sources in this db
    all_data_sources = []
    per_table = {}

    show_tables = "show tables;"
    cursor.execute(show_tables)
    for row in cursor:
        tablename = row.values()[0]
        tablename = tablename.encode('ascii', 'ignore')
        # print( "tablename is " + tablename)
        if tablename not in skiptables and 'obs' not in tablename:
            # parse the data sources from the table names
            if '_mwr' in tablename:
                data_source = re.sub('_mwr.*', '', tablename)
            elif '_wl' in tablename:
                data_source = re.sub('_wl.*', '', tablename)
            else:
                data_source = tablename
            if data_source not in all_data_sources:
                all_data_sources.append(data_source)
            per_table[tablename] = {}
            per_table[tablename]['data_source'] = data_source

    # sys.exit(-1)

    # parse the other metadata contained in the tables
    if TScleaned:
        for tablename in per_table.keys():
            # get forecast lengths from this table
            get_fcst_lens = ("SELECT DISTINCT fcst_len FROM " + tablename + ";")
            cursor.execute(get_fcst_lens)
            per_table[tablename]['fcst_lens'] = []
            this_fcst_lens = []
            for row in cursor:
                val = row.values()[0]
                this_fcst_lens.append(int(val))
            this_fcst_lens.sort(key=int)
            per_table[tablename]['fcst_lens'] = this_fcst_lens
            # print(tablename + " fcst_lens: " + str(per_table[tablename]['fcst_lens']) )

            # get regions from this table
            get_regions = ("SELECT DISTINCT sta_id FROM " + tablename + ";")
            cursor.execute(get_regions)
            per_table[tablename]['regions'] = []
            this_regions = []
            for row in cursor:
                val = row.values()[0]
                this_regions.append(int(val))
            this_regions.sort(key=int)
            per_table[tablename]['regions'] = this_regions
            # print(tablename + " regions: " + str(per_table[tablename]['regions']) )

            # get statistics for this table
            get_tablestats = "SELECT min(time) AS mindate, max(time) AS maxdate, count(time) AS numrecs FROM " + tablename + ";"
            cursor.execute(get_tablestats)
            stats = cursor.fetchall()[0]
            # print(tablename + " stats:\n" + str(stats) )

            replace_tablestats_rec = "REPLACE INTO TABLESTATS_build (tablename, mindate, maxdate, data_source, region, fcst_lens, numrecs) values( %s, %s, %s, %s, %s, %s, %s )"
            qd = []
            qd.append(str(tablename))
            qd.append(str(stats['mindate']))
            qd.append(str(stats['maxdate']))
            qd.append(str(per_table[tablename]['data_source']))
            qd.append(str(per_table[tablename]['regions']))
            qd.append(str(per_table[tablename]['fcst_lens']))
            qd.append(str(stats['numrecs']))
            cursor.execute(replace_tablestats_rec, qd)
            cnx.commit()
        # sys.exit(-1)
    else:
        print("TScleaned is " + str(TScleaned) + " skipped populating TABLESTATS_build")

    # sys.exit(-1)

    # refresh database connection
    cursor.close()
    cnx.close()

    try:
        cnx = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    cursor.execute(usedb)

    # clean metadata build table
    clean_rpmmac = "delete from regions_per_model_mats_all_categories_build"
    cursor.execute(clean_rpmmac)
    cnx.commit()
    set_ai = "alter table regions_per_model_mats_all_categories_build auto_increment = 1"
    cursor.execute(set_ai)
    cnx.commit()

    # sort the data sources into groups
    data_sources_in_this_app = all_data_sources
    data_sources_in_this_app.sort(key=str.lower)
    data_source_cats = {}
    data_source_key_cats = {}

    ds_idx = 1

    for model in data_sources_in_this_app:
        sub_idx = model.find('_', 0)
        model_key = model[0:sub_idx]
        if model_key in data_source_key_cats.keys():
            data_source_cats[model] = data_source_key_cats[model_key]
        else:
            data_source_key_cats[model_key] = ds_idx
            data_source_cats[model] = ds_idx
            ds_idx = ds_idx + 1

    # combine the metadata per table into metadata per data source
    do = 0
    for data_source in all_data_sources:
        cat = data_source_cats[data_source]
        display_text = str(data_source)
        do = do + 1

        # get regions for all tables pertaining to this data_source
        get_these_regions = "select distinct(region) as region from " + db + ".TABLESTATS_build where tablename like '" + data_source + "%' and region != '[]' and data_source = '" + data_source + "' and numrecs > 0 order by length(region) desc;"
        cursor.execute(get_these_regions)
        these_regions = []
        for row in cursor:
            val_array = ast.literal_eval(row.values()[0])
            for val in val_array:
                if val not in these_regions:
                    these_regions.append(val)
        these_regions.sort(key=int)
        # print( "these_regions:\n" + str(these_regions) )

        # get forecast lengths for all tables pertaining to this data_source
        get_these_fcst_lens = "select distinct(fcst_lens) as fcst_lens from " + db + ".TABLESTATS_build where tablename like '" + data_source + "%' and fcst_lens != '[]' and data_source = '" + data_source + "' and numrecs > 0 order by length(fcst_lens) desc;"
        cursor.execute(get_these_fcst_lens)
        these_fcst_lens = []
        for row in cursor:
            val_array = ast.literal_eval(row.values()[0])
            for val in val_array:
                if val not in these_fcst_lens:
                    these_fcst_lens.append(val)
        these_fcst_lens.sort(key=int)
        # print( "these_fcst_lens:\n" + str(these_fcst_lens) )

        get_cat_stats = "select min(mindate) as mindate, max(maxdate) as maxdate, sum(numrecs) as numrecs from " + db + ".TABLESTATS_build where tablename like '" + data_source + "%' and data_source = '" + data_source + "' and numrecs > 0"
        cursor.execute(get_cat_stats)
        catstats = cursor.fetchall()[0]
        # print( "catstats:\n" + str(catstats) )

        # update the metadata for this data source in the build table
        if len(these_regions) > 0 and len(these_fcst_lens) > 0:
            update_rpm_record(cnx, cursor, data_source, display_text, these_regions, these_fcst_lens, cat, do, catstats['mindate'], catstats['maxdate'], catstats['numrecs'])

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
        print("deploy " + db + ".regions_per_model_mats_all_categories complete at " + str(updated_utc))
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
            msg = 'BLRS MATS METADATA START: ' + utcnow
            print(msg)
            regions_per_model_mats_all_categories('deploy')
            utcnow = str(datetime.now())
            msg = 'BLRS MATS METADATA END: ' + utcnow
            print(msg)
