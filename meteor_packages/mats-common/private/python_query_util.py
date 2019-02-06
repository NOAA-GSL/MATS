import sys
from datetime import datetime
import MySQLdb
import json

d = {
    "x": [],
    "y": [],
    "error_x": [],
    "error_y": [],
    "subVals": [],
    "subSecs": [],
    "subLevs": [],
    "stats": [],
    "text": [],
    "xmin": float('inf'),
    "xmax": float('-inf'),
    "ymin": float('inf'),
    "ymax": float('-inf'),
    "sum": 0
}
error_bool = False
error = ""
n0 = []
n_times = []
cycles = []


def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False


def connect_to_mysql():
    global error
    global error_bool
    try:
        cnx = MySQLdb.connect(read_default_file="../../../apps/met-upperair/settings/settings-mysql.cnf")
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
        return cnx, cursor
    except MySQLdb.Error as e:
        error = str(e)
        error_bool = True


def disconnect_mysql(cnx, cursor):
    global error
    global error_bool
    try:
        cursor.close()
        cnx.close()
    except MySQLdb.Error as e:
        error = str(e)
        error_bool = True


def parse_query_data_timeseries(cursor, has_levels, completeness_qc_param):
    global d
    global n0
    global n_times
    global cycles
    global error
    global error_bool

    d['error_x'] = None
    xmax = float("-inf")
    xmin = float("inf")
    curve_times = []
    curve_stats = []
    sub_vals_all = []
    sub_secs_all = []
    sub_levs_all = []

    query_data = cursor.fetchall()
    time_interval = int(query_data[1]['avtime']) - int(query_data[0]['avtime']) if len(query_data) > 1 else None

    for row in query_data:
        row_idx = query_data.index(row)
        av_seconds = int(row['avtime'])
        av_time = av_seconds * 1000
        xmin = av_time if av_time < xmin else xmin
        xmax = av_time if av_time > xmax else xmax
        stat = row['stat']
        n0.append(int(row['N0']))
        n_times.append(int(row['N_times']))

        if row_idx < len(query_data) - 1:
            time_diff = int(query_data[row_idx + 1]['avtime']) - int(row['avtime'])
            if time_diff < time_interval:
                time_interval = time_diff

        if stat != "null" and stat != "NULL":
            try:
                sub_values = str(row['sub_values0']).split(',')
                sub_values = [float(i) for i in sub_values]
                sub_secs = str(row['sub_secs0']).split(',')
                sub_secs = [int(i) for i in sub_secs]
                if has_levels:
                    sub_levs = str(row['sub_levs0']).split(',')
                    if is_number(sub_levs[0]):
                        sub_levs = [int(i) for i in sub_levs]
            except KeyError as e:
                error = "Error in parseQueryDataTimeSeries. The expected fields don't seem to be present " \
                        "in the results cache: " + str(e)
                error_bool = True
                return
        else:
            sub_values = float('nan')
            sub_secs = float('nan')
            if has_levels:
                sub_levs = float('nan')

        curve_times.append(av_time)
        curve_stats.append(stat)
        sub_vals_all.append(sub_values)
        sub_secs_all.append(sub_secs)
        if has_levels:
            sub_levs_all.append(sub_levs)

    n0_max = max(n0)
    n_times_max = max(n_times)

    if xmin < query_data[0]['avtime'] * 1000:
        xmin = query_data[0]['avtime'] * 1000

    time_interval = time_interval * 1000
    loop_time = xmin
    loop_sum = 0

    while loop_time <= xmax:
        if loop_time not in curve_times:
            if has_levels:
                d['x'].append(loop_time)
                d['y'].append(None)
                d['error_y'].append(None)
                d['subVals'].append(float('nan'))
                d['subSecs'].append(float('nan'))
                d['subLevs'].append(float('nan'))
            else:
                d['x'].append(loop_time)
                d['y'].append(None)
                d['error_y'].append(None)
                d['subVals'].append(float('nan'))
                d['subSecs'].append(float('nan'))
        else:
            d_idx = curve_times.index(loop_time)
            this_n0 = n0[d_idx]
            this_n_times = n_times[d_idx]
            if this_n0 < 0.1 * n0_max or this_n_times < float(completeness_qc_param) * n_times_max:
                if has_levels:
                    d['x'].append(loop_time)
                    d['y'].append(None)
                    d['error_y'].append(None)
                    d['subVals'].append(float('nan'))
                    d['subSecs'].append(float('nan'))
                    d['subLevs'].append(float('nan'))
                else:
                    d['x'].append(loop_time)
                    d['y'].append(None)
                    d['error_y'].append(None)
                    d['subVals'].append(float('nan'))
                    d['subSecs'].append(float('nan'))

            else:
                loop_sum += curve_stats[d_idx]
                if has_levels:
                    d['x'].append(loop_time)
                    d['y'].append(curve_stats[d_idx])
                    d['error_y'].append(None)
                    d['subVals'].append(sub_vals_all[d_idx])
                    d['subSecs'].append(sub_secs_all[d_idx])
                    d['subLevs'].append(sub_levs_all[d_idx])
                else:
                    d['x'].append(loop_time)
                    d['y'].append(curve_stats[d_idx])
                    d['error_y'].append(None)
                    d['subVals'].append(sub_vals_all[d_idx])
                    d['subSecs'].append(sub_secs_all[d_idx])

        loop_time = loop_time + time_interval

    cycles = [time_interval]

    d['xmin'] = min(x for x in d['x'] if is_number(x))
    d['xmax'] = max(x for x in d['x'] if is_number(x))
    d['ymin'] = min(y for y in d['y'] if is_number(y))
    d['ymax'] = max(y for y in d['y'] if is_number(y))
    d['sum'] = loop_sum


def query_db(cnx, cursor, statement, plot_type, has_levels, completeness_qc_param):
    global d
    global n0
    global n_times
    global cycles
    global error
    global error_bool

    try:
        print(statement)
        cursor.execute(statement)
    except MySQLdb.Error as e:
        error = str(e)
        error_bool = True

    if not error_bool:
        if cursor.rowcount == 0:
            error = "NO_DATA_FOUND"
            error_bool = True
        else:
            if plot_type == 'TimeSeries':
                parse_query_data_timeseries(cursor, has_levels, completeness_qc_param)


def main(args):
    global error_bool
    cnx, cursor = connect_to_mysql()
    if not error_bool:
        query_db(cnx, cursor, args[1], args[2], args[3], args[4])
    if not error_bool:
        disconnect_mysql(cnx, cursor)


if __name__ == '__main__':
    # needed js args: [1] statement, [2] plotType, [3] hasLevels, [4] completenessQCParam
    utc_now = str(datetime.now())
    msg = 'Calling python query function at: ' + utc_now
    print(msg)
    main(sys.argv)
    utc_now = str(datetime.now())
    msg = 'Returning results from python query function at: ' + utc_now
    print(msg)
