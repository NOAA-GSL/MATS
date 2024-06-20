#!/usr/bin/env python
#
# Creates a regions_per_model_mats_all_categories table for all models in surfrad4

# __future__ must come first
from __future__ import print_function
from datetime import datetime, timedelta

import re
import sys
import ast
import MySQLdb
import time


############################################################################

def update_rpm_record(cnx, cursor, table_name, display_text, regions, fcst_lens, scales, display_category, display_order, mindate, maxdate, numrecs):

    # see if this record already exists (it shouldn't, because this script cleaned the tables when it started)
    find_rpm_rec = "SELECT id FROM regions_per_model_mats_all_categories_build WHERE model = '" + \
        str(table_name) + "'"
    cursor.execute(find_rpm_rec)
    record_id = int(0)
    for row in cursor:
        val = list(row.values())[0]
        record_id = int(val)

    if len(regions) > int(0) and len(fcst_lens) > int(0) and len(scales) > int(0):
        qd = []
        updated_utc = datetime.utcnow().strftime('%s')
        # if it's a new record (it should be) add it
        if record_id == 0:
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories_build (model, display_text, regions, fcst_lens, scle, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd.append(str(table_name))
            qd.append(str(display_text))
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(scales))
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
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories_build SET regions = %s, fcst_lens = %s, scle = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(scales))
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
        # location of cnf file on Hera; edit if running locally
        cnx = MySQLdb.connect(read_default_file="/home/role.amb-verif/.my.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute("set session wait_timeout=28800")
        cursor.execute("set session interactive_timeout=28800")
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    db = "surfrad4"
    usedb = "use " + db
    cursor.execute(usedb)

    # clean TABLESTATS_build in order to get updated data source information. If nothing has changed, you can set
    # TScleaned to False and just use the old data source info.
    clean_tablestats = "delete from " + db + ".TABLESTATS_build"
    # TScleaned = False
    TScleaned = True
    if TScleaned:
        cursor.execute(clean_tablestats)
    else:
        print("NOT executing: " + str(clean_tablestats))

    # string of tables not to include in our search for metadata
    skiptables = " all_display_categories all_display_categories_build all_display_categories_dev regions_per_model_mats_all_categories regions_per_model_mats_all_categories_dev regions_per_model_mats_all_categories_build template TABLESTATS_build stations surfrad scale_descriptions station_descriptions tables_to_backup template_HRRR "

    # get an array of all relevant data sources in this db
    all_data_sources = []
    per_table = {}

    show_tables = "show tables;"
    cursor.execute(show_tables)
    for row in cursor:
        tablename = str(list(row.values())[0])
        # print( "tablename is " + tablename)
        if " " + tablename + " " not in skiptables and "all" not in tablename:
            # parse the data sources from the table names
            model = re.sub("_site_.*", "", tablename)
            if model not in all_data_sources:
                all_data_sources.append(model)
            per_table[tablename] = {}
            per_table[tablename]['model'] = model
            region = re.sub(model + "_site_", "", tablename)
            per_table[tablename]['region'] = region
            print("model is " + model + ", region is " + region)

    sys.exit(-1)

    # parse the other metadata contained in the tables
    if TScleaned:
        for tablename in per_table.keys():
            # length limit necessary for the really huge tables in this database
            length_limiter = "(select * from " + \
                tablename + " limit 1000000) as m0"
            length_limiter_test = "select * from " + tablename + " limit 1000000"
            cursor.execute(length_limiter_test)
            cursor.fetchall()
            hits_length_limit = cursor.rowcount == 1000000
            # get forecast lengths from this table
            get_fcst_lens = (
                "SELECT DISTINCT fcst_len FROM " + length_limiter + ";")
            cursor.execute(get_fcst_lens)
            per_table[tablename]['fcst_lens'] = []
            this_fcst_lens = []
            for row in cursor:
                val = list(row.values())[0]
                this_fcst_lens.append(int(val))
            this_fcst_lens.sort(key=int)
            per_table[tablename]['fcst_lens'] = this_fcst_lens
            # print(tablename + " fcst_lens: " + str(per_table[tablename]['fcst_lens']) )

            # get scales from this table
            get_scales = ("SELECT DISTINCT scale FROM " + length_limiter + ";")
            cursor.execute(get_scales)
            per_table[tablename]['scales'] = []
            this_scales = []
            for row in cursor:
                val = list(row.values())[0]
                this_scales.append(int(val))
            this_scales.sort(key=int)
            per_table[tablename]['scales'] = this_scales
            # print(tablename + " scales: " + str(per_table[tablename]['scales']) )

            # get regions from this table
            get_regions = ("SELECT DISTINCT id FROM " + length_limiter + ";")
            cursor.execute(get_regions)
            per_table[tablename]['regions'] = []
            this_regions = []
            for row in cursor:
                val = list(row.values())[0]
                this_regions.append(int(val))
            this_regions.sort(key=int)
            per_table[tablename]['regions'] = this_regions
            # print(tablename + " regions: " + str(per_table[tablename]['regions']) )

            # get statistics for this table
            get_tablestats = "SELECT min(secs) AS mindate, max(secs) AS maxdate, count(secs) AS numrecs FROM " + \
                length_limiter + ";"

            cursor.execute(get_tablestats)
            stats = cursor.fetchall()[0]
            if hits_length_limit:
                nowtime = int(time.time())
                stats['maxdate'] = nowtime - (nowtime % 3600)
            # print(tablename + " stats:\n" + str(stats) )

            replace_tablestats_rec = "REPLACE INTO TABLESTATS_build (tablename, mindate, maxdate, model, region, fcst_lens, scle, numrecs) values( %s, %s, %s, %s, %s, %s, %s, %s )"
            qd = []
            qd.append(str(tablename))
            qd.append(str(stats['mindate']))
            qd.append(str(stats['maxdate']))
            qd.append(str(per_table[tablename]['model']))
            qd.append(str(per_table[tablename]['regions']))
            qd.append(str(per_table[tablename]['fcst_lens']))
            qd.append(str(per_table[tablename]['scales']))
            qd.append(str(stats['numrecs']))
            cursor.execute(replace_tablestats_rec, qd)
            cnx.commit()
        # sys.exit(-1)
    else:
        print("TScleaned is " + str(TScleaned) +
              " skipped populating TABLESTATS_build")

    # sys.exit(-1)

    # refresh database connection
    cursor.close()
    cnx.close()

    try:
        cnx = MySQLdb.connect(read_default_file="/home/role.amb-verif/.my.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute("set session wait_timeout=28800")
        cursor.execute("set session interactive_timeout=28800")
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    cursor.execute(usedb)

    # use standardized model names
    try:
        cnx4 = MySQLdb.connect(
            read_default_file="/home/role.amb-verif/.my.cnf")
        cnx4.autocommit = True
        cursor4 = cnx4.cursor(MySQLdb.cursors.DictCursor)
        cursor4.execute("set session wait_timeout=28800")
        cursor4.execute("set session interactive_timeout=28800")
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    usedb = "use mats_common"
    cursor4.execute(usedb)

    get_model_keys_vals = "select old_model,new_model from standardized_model_list;"
    cursor4.execute(get_model_keys_vals)

    main_model_keys = []
    main_models = {}
    for row in cursor4:
        old_model = str(row['old_model'])
        new_model = str(row['new_model'])
        if old_model in all_data_sources:
            main_model_keys.append(old_model)
            main_models[old_model] = new_model

    get_model_orders = "select model,m_order from primary_model_orders order by m_order;"
    cursor4.execute(get_model_orders)

    new_model_list = list(main_models.values())
    main_model_order_keys = []
    main_model_orders = {}
    for row in cursor4:
        new_model = str(row['model'])
        m_order = int(row['m_order'])
        if new_model in new_model_list:
            main_model_order_keys.append(new_model)
            main_model_orders[new_model] = m_order

    cursor4.close()
    cnx4.close()

    # sys.exit(-1)

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

    ds_idx = 2

    for model in data_sources_in_this_app:
        if model in main_model_keys and main_models[model] in main_model_order_keys:
            data_source_cats[model] = 1
        else:
            sub_idx = model.find('_', 0)
            model_key = model[0:sub_idx]
            if model_key in data_source_key_cats.keys():
                data_source_cats[model] = data_source_key_cats[model_key]
            else:
                data_source_key_cats[model_key] = ds_idx
                data_source_cats[model] = ds_idx
                ds_idx = ds_idx + 1

    # combine the metadata per table into metadata per data source
    do_non_main = 0
    for model in all_data_sources:
        if model in main_model_keys and main_models[model] in main_model_order_keys:
            cat = 1
            display_text = main_models[model]
            do = main_model_orders[display_text]
        else:
            cat = data_source_cats[model]
            display_text = str(model)
            do = do_non_main + 1
            do_non_main = do_non_main + 1

        # get regions for all tables pertaining to this model
        get_these_regions = "select distinct(region) as region from " + db + ".TABLESTATS_build where tablename like '" + \
            model + "%' and region != '[]' and model = '" + model + \
            "' and numrecs > 0 order by length(region) desc;"
        cursor.execute(get_these_regions)
        these_regions = []
        for row in cursor:
            val_array = ast.literal_eval(list(row.values())[0])
            for val in val_array:
                if val not in these_regions:
                    these_regions.append(val)
        these_regions.sort(key=int)
        # print( "these_regions:\n" + str(these_regions) )

        # get forecast lengths for all tables pertaining to this model
        get_these_fcst_lens = "select distinct(fcst_lens) as fcst_lens from " + db + ".TABLESTATS_build where tablename like '" + \
            model + "%' and fcst_lens != '[]' and model = '" + model + \
            "' and numrecs > 0 order by length(fcst_lens) desc;"
        cursor.execute(get_these_fcst_lens)
        these_fcst_lens = []
        for row in cursor:
            val_array = ast.literal_eval(list(row.values())[0])
            for val in val_array:
                if val not in these_fcst_lens:
                    these_fcst_lens.append(val)
        these_fcst_lens.sort(key=int)
        # print( "these_fcst_lens:\n" + str(these_fcst_lens) )

        # get scales for all tables pertaining to this model
        get_these_scales = "select distinct(scle) as scle from " + db + ".TABLESTATS_build where tablename like '" + \
            model + "%' and model = '" + model + \
            "' and numrecs > 0 order by length(scle) desc;"
        cursor.execute(get_these_scales)
        these_scales = []
        for row in cursor:
            val_array = ast.literal_eval(list(row.values())[0])
            for val in val_array:
                if val not in these_scales:
                    these_scales.append(val)
        these_scales.sort(key=int)
        # print( "   thesescales:\n" + str(thesescales) )

        # get statistics for all tables pertaining to this model
        get_cat_stats = "select min(mindate) as mindate, max(maxdate) as maxdate, sum(numrecs) as numrecs from " + \
            db + ".TABLESTATS_build where tablename like '" + model + \
            "%' and model = '" + model + "' and numrecs > 0"
        cursor.execute(get_cat_stats)
        catstats = cursor.fetchall()[0]
        # print( "catstats:\n" + str(catstats) )

        # update the metadata for this data source in the build table
        if len(these_regions) > 0 and len(these_fcst_lens) > 0 and len(these_scales) > 0:
            update_rpm_record(cnx, cursor, model, display_text, these_regions, these_fcst_lens,
                              these_scales, cat, do, catstats['mindate'], catstats['maxdate'], catstats['numrecs'])

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
        print("deploy " + db +
              ".regions_per_model_mats_all_categories complete at " + str(updated_utc))
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
            msg = 'SURFRAD MATS METADATA START: ' + utcnow
            print(msg)
            regions_per_model_mats_all_categories('deploy')
            utcnow = str(datetime.now())
            msg = 'SURFRAD MATS METADATA END: ' + utcnow
            print(msg)
