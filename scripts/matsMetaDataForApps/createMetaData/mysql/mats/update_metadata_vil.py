#!/usr/bin/env python
#
# Updates the regions_per_model_mats_all_categories table for all models in vil

# __future__ must come first
from __future__ import print_function
from datetime import datetime

import re
import sys
import MySQLdb


############################################################################

def update_rpm_record(cnx, cursor, table_name, display_text, regions, fcst_lens, trshs, scales, display_category, display_order, mindate, maxdate, numrecs):

    # see if this record already exists in the build table
    # (does not guarantee the result will be the same for the prod table)
    find_rpm_rec = "SELECT id FROM regions_per_model_mats_all_categories_build WHERE model = '" + str(table_name) + "'"
    cursor.execute(find_rpm_rec)
    build_record_id = int(0)
    for row in cursor:
        val = row.values()[0]
        build_record_id = int(val)

    # see if this record already exists in the prod table
    # (does not guarantee the result will be the same for the build table)
    find_rpm_rec = "SELECT id FROM regions_per_model_mats_all_categories WHERE model = '" + str(table_name) + "'"
    cursor.execute(find_rpm_rec)
    prod_record_id = int(0)
    for row in cursor:
        val = row.values()[0]
        prod_record_id = int(val)

    if len(regions) > int(0) and len(fcst_lens) > int(0):
        qd = []
        updated_utc = datetime.utcnow().strftime('%s')
        # if it's a new record for the build table, add it
        if build_record_id == 0:
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories_build (model, display_text, regions, fcst_lens, trsh, scale, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd.append(str(table_name))
            qd.append(str(display_text))
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(trshs))
            qd.append(str(scales))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(build_record_id)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            cursor.execute(insert_rpm_rec, qd)
            cnx.commit()
        else:
            # if there's a pre-existing record for the build table, update it
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories_build SET regions = %s, fcst_lens = %s, trsh = %s, scale = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(trshs))
            qd.append(str(scales))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            qd.append(build_record_id)
            cursor.execute(update_rpm_rec, qd)
            cnx.commit()

        # reset qd array
        qd = []
        # if it's a new record for the prod table, add it
        if prod_record_id == 0:
            insert_rpm_rec = "INSERT INTO regions_per_model_mats_all_categories (model, display_text, regions, fcst_lens, trsh, scale, display_category, display_order, id, mindate, maxdate, numrecs, updated) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )"
            qd.append(str(table_name))
            qd.append(str(display_text))
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(trshs))
            qd.append(str(scales))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(prod_record_id)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            cursor.execute(insert_rpm_rec, qd)
            cnx.commit()
        else:
            # if there's a pre-existing record for the prod table, update it
            update_rpm_rec = "UPDATE regions_per_model_mats_all_categories SET regions = %s, fcst_lens = %s, trsh = %s, scale = %s, display_category = %s, display_order = %s, mindate = %s, maxdate = %s, numrecs = %s, updated = %s WHERE id = %s"
            qd.append(str(regions))
            qd.append(str(fcst_lens))
            qd.append(str(trshs))
            qd.append(str(scales))
            qd.append(display_category)
            qd.append(display_order)
            qd.append(mindate)
            qd.append(maxdate)
            qd.append(numrecs)
            qd.append(updated_utc)
            qd.append(prod_record_id)
            cursor.execute(update_rpm_rec, qd)
            cnx.commit()


############################################################################

def reprocess_specific_metadata(models_to_reprocess):
    # connect to database
    try:
        cnx = MySQLdb.connect(read_default_file="/home/amb-verif/.my.cnf")  # location of cnf file on Hera; edit if running locally
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

    db = "vil"
    usedb = "use " + db
    cursor.execute(usedb)
    cursor2.execute(usedb)

    db3 = "mats_common"
    usedb3 = "use " + db3
    cursor3.execute(usedb3)

    # get a map of valid MATS regions
    valid_regions = {}
    valid_region_orders = {}
    get_valid_regions = "select id,short_name from region_descriptions"
    cursor3.execute(get_valid_regions)
    for row in cursor3:
        region_name = row['short_name']
        region_id = row['id']
        valid_regions[region_name] = region_id
    for region_name in valid_regions.keys():
        get_region_order = "select region_order from region_orders where id=" + str(valid_regions[region_name]) + ";"
        cursor3.execute(get_region_order)
        for row in cursor3:
            region_order = int(row['region_order'])
            valid_region_orders[region_name] = region_order

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
        per_model[model]['display_text'] = ""
        per_model[model]['region'] = []
        per_model[model]['fcst_len'] = []
        per_model[model]['trshs'] = []
        per_model[model]['scale'] = []
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
        show_tables = ("show tables like '" + model + "_%';")
        cursor.execute(show_tables)
        for row in cursor:
            tablename = row.values()[0]
            tablename = tablename.encode('ascii', 'ignore')
            table_model = re.sub('_[0-9][0-9]km_.*', '', tablename)
            if table_model == model:
                # this is a table that does belong to this model
                get_tablestats = "SELECT min(time) AS mindate, max(time) AS maxdate, count(time) AS numrecs FROM " + tablename + ";"
                cursor2.execute(get_tablestats)
                stats = {}
                for row2 in cursor2:
                    rowkeys = row2.keys()
                    for rowkey in rowkeys:
                        val = str(row2[rowkey])
                        stats[rowkey] = val

                if int(stats['numrecs']) > 0:
                    # make sure the table actually has data
                    per_model[model]['mindate'] = int(stats['mindate']) if stats['mindate'] != 'None' and int(stats['mindate']) < per_model[model]['mindate'] else per_model[model]['mindate']
                    per_model[model]['maxdate'] = int(stats['maxdate']) if stats['maxdate'] != 'None' and int(stats['maxdate']) > per_model[model]['maxdate'] else per_model[model]['maxdate']
                    per_model[model]['numrecs'] = per_model[model]['numrecs'] + int(stats['numrecs'])

                    temp = "^" + model + "_[0-9][0-9]km_"
                    region = re.sub(temp, "", tablename)
                    if region not in per_model[model]['region']:
                        per_model[model]['region'].append(region)

                    temp1 = "^" + model + "_"
                    temp2 = "_" + region + "$"
                    scale1 = re.sub(temp1, "", tablename)
                    scale = re.sub(temp2, "", scale1)
                    if scale not in per_model[model]['scale']:
                        per_model[model]['scale'].append(scale)

                    get_fcst_lens = ("SELECT DISTINCT fcst_len FROM " + tablename + ";")
                    cursor2.execute(get_fcst_lens)
                    thisfcst_lens = []
                    for row2 in cursor2:
                        val = row2.values()[0]
                        thisfcst_lens.append(int(val))
                    per_model[model]['fcst_len'] = list(set(per_model[model]['fcst_len']) | set(thisfcst_lens))
                    per_model[model]['fcst_len'].sort(key=int)

                    get_trsh = ("SELECT DISTINCT trsh FROM " + tablename + ";")
                    cursor2.execute(get_trsh)
                    thistrsh = []
                    for row2 in cursor2:
                        val = row2.values()[0]
                        thistrsh.append(float(val))
                    per_model[model]['trshs'] = list(set(per_model[model]['trshs']) | set(thistrsh))
                    per_model[model]['trshs'].sort(key=float)

        if per_model[model]['mindate'] == sys.float_info.max:
            per_model[model]['mindate'] = str(datetime.now().strftime('%s'))
        if per_model[model]['maxdate'] == 0:
            per_model[model]['maxdate'] = str(datetime.now().strftime('%s'))

        if len(per_model[model]['region']) > 0:
            region_orders = []
            for region in per_model[model]['region']:
                region_orders.append(valid_region_orders[region])
            per_model[model]['region'] = [x for _, x in sorted(zip(region_orders, per_model[model]['region']))]

    print(per_model)

    # sys.exit(-1)

    for model in models_to_reprocess:
        if len(per_model[model]['region']) > 0 and len(per_model[model]['fcst_len']) > 0 and len(per_model[model]['trshs']) > 0 and len(per_model[model]['scale']) > 0:
            update_rpm_record(cnx, cursor, model, per_model[model]['display_text'], per_model[model]['region'], per_model[model]['fcst_len'], per_model[model]['trshs'], per_model[model]['scale'], per_model[model]['display_category'], per_model[model]['display_order'], per_model[model]['mindate'], per_model[model]['maxdate'], per_model[model]['numrecs'])

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
        msg = 'VIL MATS METADATA START: ' + utcnow
        print(msg)
        models_to_reprocess = sys.argv[1].strip().split(',')
        reprocess_specific_metadata(models_to_reprocess)
        utcnow = str(datetime.now())
        msg = 'VIL MATS METADATA END: ' + utcnow
        print(msg)
