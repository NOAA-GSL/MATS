#!/usr/bin/env python
#
# Updates the regions_per_model_mats_all_categories table for all models in anom_corr2

# __future__ must come first
from __future__ import print_function

import re
import sys
import os
import time
import MySQLdb
from datetime import datetime


# from mysql_config import DB_connect_params

############################################################################

def update_rpm_record(cnx, cursor, table_name, display_text, regions, fcstlens, variables, levels, display_category,
                      display_order,mindate, maxdate, numrecs):

    find_rpm_rec = "SELECT id FROM regions_per_model_mats_all_categories_build WHERE model = '" + str(table_name) + "'"
    # print(find_rpm_rec)
    cursor.execute(find_rpm_rec)
    record_id = int(0)
    for row in cursor:
        # print(row)
        val = row.values()[0]
        # print(val)
        record_id = int(val)

    # print( "FINAL record_id = " + str(record_id) )

    if len(regions) > int(0) and len(fcstlens) > int(0):
        qd = []
        updated_utc = datetime.utcnow().strftime('%s')
        if record_id == 0:
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories_build (model, display_text, regions, fcst_lens, variable, levels, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd.append(str(table_name))
            qd.append(str(display_text))
            qd.append(str(regions))
            qd.append(str(fcstlens))
            qd.append(str(variables))
            qd.append(str(levels))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(record_id)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            # print( "insert_rpm_rec: " + insert_rpm_rec )
            # print( "qd = " + str(qd) )
            cursor.execute(insert_rpm_rec, qd)
            cnx.commit()
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories (model, display_text, regions, fcst_lens, variable, levels, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            cursor.execute(insert_rpm_rec, qd)
            cnx.commit()
        else:
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories_build SET regions = %s, fcst_lens = %s, variable = %s, levels = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            qd.append(str(regions))
            qd.append(str(fcstlens))
            qd.append(str(variables))
            qd.append(str(levels))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            qd.append(record_id)
            # print( "update_rpm_rec: " + update_rpm_rec )
            # print( "qd = " + str(qd) )
            cursor.execute(update_rpm_rec, qd)
            cnx.commit()
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories SET regions = %s, fcst_lens = %s, variable = %s, levels = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            cursor.execute(update_rpm_rec, qd)
            cnx.commit()


############################################################################

def reprocess_specific_metadata(models_to_reprocess):
    os.environ['TZ'] = 'UTC'
    #  try:
    # cnx = mysql.connector.connect( **DB_connect_params )
    try:
        cnx = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    try:
        cnx2 = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")
        cnx2.autocommit = True
        cursor2 = cnx2.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    try:
        cnx3 = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")
        cnx3.autocommit = True
        cursor3 = cnx3.cursor(MySQLdb.cursors.DictCursor)
    except MySQLdb.Error as e:
        print("Error: " + str(e))
        sys.exit(1)

    db = "anom_corr2"
    usedb = "use " + db
    cursor.execute(usedb)
    cursor2.execute(usedb)

    db3 = "mats_common"
    usedb3 = "use " + db3
    cursor3.execute(usedb3)

    valid_regions = []
    valid_region_orders = {}
    get_valid_regions = "select id from region_descriptions"
    cursor3.execute(get_valid_regions)
    for (line) in cursor3:
        region_id = line['id']
        valid_regions.append(region_id)
    for region_id in valid_regions:
        get_region_order = "select region_order from region_orders where id=" + str(region_id) + ";"
        cursor3.execute(get_region_order)
        for line in cursor3:
            region_order = int(line['region_order'])
            valid_region_orders[region_id] = region_order

    # get common MATS model names
    get_model_keys_vals = "select old_model,new_model from standardized_model_list;"
    cursor3.execute(get_model_keys_vals)

    main_model_keys = []
    main_models = {}
    for row in cursor3:
        old_model = str(row['old_model'])
        new_model = str(row['new_model'])
        main_model_keys.append(old_model)
        main_models[old_model] = new_model

    get_model_orders = "select model,m_order from primary_model_orders order by m_order;"
    cursor3.execute(get_model_orders)

    new_model_list = main_models.values()
    main_model_orders = {}
    for row in cursor3:
        new_model = str(row['model'])
        m_order = int(row['m_order'])
        if new_model in new_model_list:
            main_model_orders[new_model] = m_order

    # get max category used so far
    cursor3.execute(usedb)
    cursor3.execute("select max(display_category) from regions_per_model_mats_all_categories;")
    for row in cursor3:
        max_display_category = row.values()[0]
    curr_model_order = 1

    cursor3.close()
    cnx3.close()

    per_model = {}
    for model in models_to_reprocess:
        # initialize output object
        per_model[model] = {}
        per_model[model]['region'] = []
        per_model[model]['fcst_lens'] = []
        per_model[model]['variables'] = []
        per_model[model]['levels'] = []
        per_model[model]['mindate'] = sys.float_info.max
        per_model[model]['maxdate'] = 0
        per_model[model]['numrecs'] = 0

        if model in main_model_keys:
            per_model[model]['display_text'] = main_models[model]
            per_model[model]['display_category'] = 1
            per_model[model]['display_order'] = main_model_orders[per_model[model]['display_text']]
        else:
            get_display_params = "select display_category,display_order from regions_per_model_mats_all_categories where model = '" + model + "';"
            cursor2.execute(get_display_params)
            per_model[model]['display_text'] = model
            if cursor2.rowcount == 0:
                per_model[model]['display_category'] = int(max_display_category) + 1
                per_model[model]['display_order'] = curr_model_order
                curr_model_order = curr_model_order + 1
            else:
                for row in cursor2:
                    per_model[model]['display_category'] = row['display_category']
                    per_model[model]['display_order'] = row['display_order']

        # get all tables that remotely resemble this model name
        show_tables = ("show tables like '" + model + "_anomcorr_%';")
        cursor.execute(show_tables)
        for (line) in cursor:
            table_name = line.values()[0]
            table_string = table_name.encode('ascii', 'ignore')
            table_model = re.sub('_anomcorr_.*', '', table_string)
            if table_model == model:
                # this is a table that does belong to this model
                get_tablestats = "SELECT min(valid_date) AS mindate, max(valid_date) AS maxdate, count(valid_date) AS numrecs FROM " + table_string + ";"
                cursor2.execute(get_tablestats)
                stats = {}
                for row in cursor2:
                    rowkeys = row.keys()
                    for rowkey in rowkeys:
                        val = str(row[rowkey])
                        stats[rowkey] = val

                if int(stats['numrecs']) > 0:
                    # make sure the table actually has data
                    if stats['mindate'] != 'None':
                        get_minhour = "SELECT min(valid_hour) AS minhour FROM " + table_string + " WHERE valid_date = '" + stats['mindate'] + "' ;"
                        cursor2.execute(get_minhour)
                        for row in cursor2:
                            minhour = str(row['minhour'])
                            stats['mindate'] = int(time.mktime(time.strptime(stats['mindate'] + ' ' + minhour, '%Y-%m-%d %H')))
                        per_model[model]['mindate'] = stats['mindate'] if stats['mindate'] < per_model[model]['mindate'] else per_model[model]['mindate']

                    if stats['maxdate'] != 'None':
                        get_maxhour = "SELECT max(valid_hour) AS maxhour FROM " + table_string + " WHERE valid_date = '" + stats['maxdate'] + "' ;"
                        cursor2.execute(get_maxhour)
                        for row in cursor2:
                            maxhour = str(row['maxhour'])
                            stats['maxdate'] = int(time.mktime(time.strptime(stats['maxdate'] + ' ' + maxhour, '%Y-%m-%d %H')))
                        per_model[model]['maxdate'] = stats['maxdate'] if stats['maxdate'] > per_model[model]['maxdate'] else per_model[model]['maxdate']

                    per_model[model]['numrecs'] = per_model[model]['numrecs'] + int(stats['numrecs'])

                    temp = "^" + model + "_anomcorr_"
                    region = re.sub(temp, "", table_string)
                    per_model[model]['region'].append(region)

                    get_fcst_lens = ("SELECT DISTINCT fcst_len FROM " + table_string + ";")
                    cursor2.execute(get_fcst_lens)
                    thisfcst_lens = []
                    for row in cursor2:
                        val = row.values()[0]
                        thisfcst_lens.append(int(val))
                    per_model[model]['fcst_lens'] = list(set(per_model[model]['fcst_lens']) | set(thisfcst_lens))
                    per_model[model]['fcst_lens'].sort(key=int)

                    get_levels = ("SELECT DISTINCT level FROM " + table_string + ";")
                    cursor2.execute(get_levels)
                    thislevels = []
                    for row in cursor2:
                        val = row.values()[0]
                        thislevels.append(int(val))
                    per_model[model]['levels'] = list(set(per_model[model]['levels']) | set(thislevels))
                    per_model[model]['levels'].sort(key=int)

                    get_vars = ("SELECT DISTINCT variable FROM " + table_string + ";")
                    cursor2.execute(get_vars)
                    thisvars = []
                    for row in cursor2:
                        val = row.values()[0]
                        thisvars.append(str(val))
                    per_model[model]['variables'] = list(set(per_model[model]['variables']) | set(thisvars))

        if per_model[model]['mindate'] == sys.float_info.max:
            per_model[model]['mindate'] = str(datetime.now().strftime('%s'))
        if per_model[model]['maxdate'] == 0:
            per_model[model]['maxdate'] = str(datetime.now().strftime('%s'))

        if len(per_model[model]['region']) > 0:
            region_orders = []
            for region in per_model[model]['region']:
                region_orders.append(valid_region_orders[int(region)])
            per_model[model]['region'] = [x for _, x in sorted(zip(region_orders, per_model[model]['region']))]

    print(per_model)

    # print("sys.exit(-1)")
    # sys.exit(-1)

    usedb = "use " + db
    cursor.execute(usedb)
    for model in models_to_reprocess:
        if len(per_model[model]['region']) > 0 and len(per_model[model]['fcst_lens']) > 0 and len(per_model[model]['levels']) > 0 and len(per_model[model]['variables']) > 0:
            update_rpm_record(cnx, cursor, model, per_model[model]['display_text'], per_model[model]['region'], per_model[model]['fcst_lens'], per_model[model]['variables'], per_model[model]['levels'], per_model[model]['display_category'], per_model[model]['display_order'], per_model[model]['mindate'], per_model[model]['maxdate'], per_model[model]['numrecs'])

    updated_utc = datetime.utcnow().strftime('%Y/%m/%d %H:%M')
    print("deploy " + db + ".regions_per_model_mats_all_categories complete at " + str(updated_utc))

    cursor.close()
    cnx.close()
    cursor2.close()
    cnx2.close()


if __name__ == '__main__':
    # args[1] should be a comma-separated list of models to reprocess
    if len(sys.argv) == 2:
        utcnow = str(datetime.now())
        msg = 'ANOMALYCOR MATS METADATA START: ' + utcnow
        print(msg)
        models_to_reprocess = sys.argv[1].strip().split(',')
        reprocess_specific_metadata(models_to_reprocess)
        utcnow = str(datetime.now())
        msg = 'ANOMALYCOR MATS METADATA END: ' + utcnow
        print(msg)
