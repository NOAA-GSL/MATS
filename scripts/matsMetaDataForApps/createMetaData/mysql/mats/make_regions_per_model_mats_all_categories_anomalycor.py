#!/usr/bin/env python
#
# Creates a regions_per_model_mats_all_categories table for all models in anom_corr2

# __future__ must come first
from __future__ import print_function
from datetime import datetime

import time
import re
import sys
import ast
import MySQLdb


############################################################################

def update_rpm_record(cnx, cursor, table_name, display_text, regions, fcst_lens, variables, levels, display_category, display_order, mindate, maxdate, numrecs):

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
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories_build (model, display_text, regions, fcst_lens, variable, levels, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd.append(str(table_name))
            qd.append(str(display_text))
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(variables))
            qd.append(str(levels))
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
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories_build SET regions = %s, fcst_lens = %s, variable = %s, levels = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(variables))
            qd.append(str(levels))
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
        cnx3 = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")
        cnx3.autocommit = True
        cursor3 = cnx3.cursor(MySQLdb.cursors.DictCursor)
        cursor3.execute("set session wait_timeout=28800")
        cursor3.execute("set session interactive_timeout=28800")
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    db = "anom_corr2"
    usedb = "use " + db
    cursor.execute(usedb)

    db3 = "mats_common"
    usedb3 = "use " + db3
    cursor3.execute(usedb3)

    # get valid MATS regions
    valid_regions = []
    valid_region_orders = {}
    get_valid_regions = "select id from region_descriptions"
    cursor3.execute(get_valid_regions)
    for row in cursor3:
        region_id = row['id']
        valid_regions.append(region_id)
    for region_id in valid_regions:
        get_region_order = "select region_order from region_orders where id=" + str(region_id) + ";"
        cursor3.execute(get_region_order)
        for row in cursor3:
            region_order = int(row['region_order'])
            valid_region_orders[region_id] = region_order

    cursor3.close()
    cnx3.close()

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
    skiptables = " template regions all_display_categories all_display_categories_build all_display_categories_dev regions_per_model_mats_all_categories regions_per_model_mats_all_categories_dev regions_per_model_mats_all_categories_build tables_to_backup TABLESTATS_build "

    # get an array of all relevant data sources in this db
    all_data_sources = []
    per_table = {}

    show_tables = "show tables like '%_anomcorr_%';"
    cursor.execute(show_tables)
    for row in cursor:
        tablename = row.values()[0]
        tablename = tablename.encode('ascii', 'ignore')
        # print( "tablename is " + tablename)
        if " " + tablename + " " not in skiptables:
            # parse the data sources and regions from the table names
            model = re.sub('_anomcorr_.*', '', tablename)
            if model not in all_data_sources:
                all_data_sources.append(model)
            per_table[tablename] = {}
            per_table[tablename]['model'] = model
            temp = "^" + model + "_anomcorr_"
            region = re.sub(temp, "", tablename)
            per_table[tablename]['region'] = region
            # print("model is " + model + ", region is " + region)

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

            # get levels from this table
            get_levels = ("SELECT DISTINCT level FROM " + tablename + ";")
            cursor.execute(get_levels)
            per_table[tablename]['levels'] = []
            this_levels = []
            for row in cursor:
                val = row.values()[0]
                this_levels.append(int(val))
            this_levels.sort(key=int)
            per_table[tablename]['levels'] = this_levels
            # print(tablename + " this_levels: " + str(per_table[tablename]['levels']) )

            # get variables from this table
            get_vars = ("SELECT DISTINCT variable FROM " + tablename + ";")
            cursor.execute(get_vars)
            per_table[tablename]['vars'] = []
            this_vars = []
            for row in cursor:
                val = row.values()[0]
                this_vars.append(str(val))
            this_vars.sort(key=str)
            per_table[tablename]['vars'] = this_vars
            # print(tablename + " this_vars: " + str(per_table[tablename]['vars']) )

            # get statistics for this table
            get_tablestats = "SELECT min(valid_date) AS mindate, max(valid_date) AS maxdate, count(valid_date) AS numrecs FROM " + tablename + ";"
            cursor.execute(get_tablestats)
            stats = {}
            for row in cursor:
                rowkeys = row.keys()
                for rowkey in rowkeys:
                    val = str(row[rowkey])
                    stats[rowkey] = val

            if stats['mindate'] != 'None':
                get_minhour = "SELECT min(valid_hour) AS minhour FROM " + tablename + " WHERE valid_date = '" + stats['mindate'] + "' ;"
                cursor.execute(get_minhour)
                for row in cursor:
                    minhour = str(row['minhour'])
                    stats['mindate'] = int(time.mktime(time.strptime(stats['mindate'] + ' ' + minhour, '%Y-%m-%d %H')))

            if stats['maxdate'] != 'None':
                get_maxhour = "SELECT max(valid_hour) AS maxhour FROM " + tablename + " WHERE valid_date = '" + stats['maxdate'] + "' ;"
                cursor.execute(get_maxhour)
                for row in cursor:
                    maxhour = str(row['maxhour'])
                    stats['maxdate'] = int(time.mktime(time.strptime(stats['maxdate'] + ' ' + maxhour, '%Y-%m-%d %H')))

            # print(tablename + " stats:\n" + str(stats) )

            replace_tablestats_rec = "REPLACE INTO TABLESTATS_build (tablename, mindate, maxdate, model, region, fcst_lens, variable, levels, numrecs) values( %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd = []
            qd.append(tablename)
            qd.append(str(stats['mindate']))
            qd.append(str(stats['maxdate']))
            qd.append(str(per_table[tablename]['model']))
            qd.append(str(per_table[tablename]['region']))
            qd.append(str(per_table[tablename]['fcst_lens']))
            qd.append(str(per_table[tablename]['vars']))
            qd.append(str(per_table[tablename]['levels']))
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
        cursor.execute("set session wait_timeout=28800")
        cursor.execute("set session interactive_timeout=28800")
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    db = "anom_corr2"
    usedb = "use " + db
    cursor.execute(usedb)

    # use standardized model names
    try:
        cnx4 = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")
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

    new_model_list = main_models.values()
    main_model_orders = {}
    for row in cursor4:
        new_model = str(row['model'])
        m_order = int(row['m_order'])
        if new_model in new_model_list:
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
        if model in main_model_keys:
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
        if model in main_model_keys:
            cat = 1
            display_text = main_models[model]
            do = main_model_orders[display_text]
        else:
            cat = data_source_cats[model]
            display_text = str(model)
            do = do_non_main + 1
            do_non_main = do_non_main + 1

        # get regions for all tables pertaining to this model
        get_these_regions = "select distinct(region) as region from " + db + ".TABLESTATS_build where tablename like '" + model + "%' and model = '" + model + "' and numrecs > 0;"
        cursor.execute(get_these_regions)
        these_regions_raw = []
        these_regions_orders = []
        for row in cursor:
            val = int(row.values()[0])
            these_regions_raw.append(val)
            these_regions_orders.append(valid_region_orders[val])
        these_regions = [x for _, x in sorted(zip(these_regions_orders, these_regions_raw))]
        # print( "these_regions:\n" + str(these_regions) )

        # get forecast lengths for all tables pertaining to this model
        get_these_fcst_lens = "select distinct(fcst_lens) as fcst_lens from " + db + ".TABLESTATS_build where tablename like '" + model + "%' and fcst_lens != '[]' and model = '" + model + "' and numrecs > 0 order by length(fcst_lens) desc;"
        cursor.execute(get_these_fcst_lens)
        these_fcst_lens = []
        for row in cursor:
            val_array = ast.literal_eval(row.values()[0])
            for val in val_array:
                if val not in these_fcst_lens:
                    these_fcst_lens.append(val)
        these_fcst_lens.sort(key=int)
        # print( "these_fcst_lens:\n" + str(these_fcst_lens) )

        # get variables for all tables pertaining to this model
        get_these_variables = "select distinct(variable) as variable from " + db + ".TABLESTATS_build where tablename like '" + model + "%' and variable != '[]' and model = '" + model + "' and numrecs > 0 order by length(variable) desc;"
        cursor.execute(get_these_variables)
        these_variables = []
        for row in cursor:
            val_array = ast.literal_eval(row.values()[0])
            for val in val_array:
                if val not in these_variables:
                    these_variables.append(val)
        these_variables.sort()
        # print( "these_variables:\n" + str(these_variables) )

        # get levels for all tables pertaining to this model
        get_these_levels = "select distinct(levels) as levels from " + db + ".TABLESTATS_build where tablename like '" + model + "%' and levels != '[]' and model = '" + model + "' and numrecs > 0 order by length(levels) desc;"
        cursor.execute(get_these_levels)
        these_levels = []
        for row in cursor:
            val_array = ast.literal_eval(row.values()[0])
            for val in val_array:
                if val not in these_levels:
                    these_levels.append(val)
        these_levels.sort(key=int)
        # print( "these_levels:\n" + str(these_levels) )

        # get statistics for all tables pertaining to this model
        get_cat_stats = "select min(mindate) as mindate, max(maxdate) as maxdate, sum(numrecs) as numrecs from " + db + ".TABLESTATS_build where tablename like '" + model + "%' and model = '" + model + "' and numrecs > 0"
        cursor.execute(get_cat_stats)
        catstats = cursor.fetchall()[0]
        # print( "catstats:\n" + str(catstats) )

        # update the metadata for this data source in the build table
        if len(these_regions) > 0 and len(these_fcst_lens) > 0 and len(these_variables) > 0 and len(these_levels) > 0:
            update_rpm_record(cnx, cursor, model, display_text, these_regions, these_fcst_lens, these_variables, these_levels, cat, do, catstats['mindate'], catstats['maxdate'], catstats['numrecs'])

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
            msg = 'ANOMALYCOR MATS METADATA START: ' + utcnow
            print(msg)
            regions_per_model_mats_all_categories('deploy')
            utcnow = str(datetime.now())
            msg = 'ANOMALYCOR MATS METADATA END: ' + utcnow
            print(msg)
