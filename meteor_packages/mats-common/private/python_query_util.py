import sys
from datetime import datetime
import MySQLdb
import numpy as np
import json

error_bool = False
error = ""
n0 = []
n_times = []
cycles = []
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
        error = "Error connecting to db: " + str(e)
        error_bool = True


def disconnect_mysql(cnx, cursor):
    global error
    global error_bool
    try:
        cursor.close()
        cnx.close()
    except MySQLdb.Error as e:
        error = "Error disconnecting from db: " + str(e)
        error_bool = True


def calculate_rms(ffbar, oobar, fobar):
    global error
    global error_bool
    try:
        rms = np.sqrt(ffbar + oobar - 2*fobar)
        return rms
    except TypeError as e:
        error = "Error calculating RMS: " + str(e)
        error_bool = True
        rms = np.empty(len(ffbar))
        return rms
    except ValueError as e:
        error = "Error calculating RMS: " + str(e)
        error_bool = True
        rms = np.empty(len(ffbar))
        return rms


def calculate_bias(fbar, obar):
    global error
    global error_bool
    try:
        bias = fbar - obar
        return bias
    except TypeError as e:
        error = "Error calculating bias: " + str(e)
        error_bool = True
        bias = np.empty(len(fbar))
        return bias
    except ValueError as e:
        error = "Error calculating bias: " + str(e)
        error_bool = True
        bias = np.empty(len(fbar))
        return bias


def calculate_n(total):
    return total


def calculate_m_avg(fbar):
    return fbar


def calculate_o_avg(obar):
    return obar


def calculate_stat(statistic, fbar, obar, ffbar, oobar, fobar, total):
    global error
    global error_bool
    stat_switch = {
        'RMS': calculate_rms,
        'Bias (Model - Obs)': calculate_bias,
        'N': calculate_n,
        'Model average': calculate_m_avg,
        'Obs average': calculate_o_avg
    }
    args_switch = {
        'RMS': (ffbar, oobar, fobar),
        'Bias (Model - Obs)': (fbar, obar),
        'N': total,
        'Model average': fbar,
        'Obs average': obar
    }
    try:
        stat_args = args_switch[statistic]
        sub_stats = stat_switch[statistic](*stat_args)
        stat = np.nanmean(sub_stats)
    except KeyError as e:
        error = "Error choosing statistic: " + str(e)
        error_bool = True
        sub_stats = np.empty(len(fbar))
        stat = 'null'
    except ValueError as e:
        error = "Error calculating statistic: " + str(e)
        error_bool = True
        sub_stats = np.empty(len(fbar))
        stat = 'null'
    return sub_stats, stat


def parse_query_data_timeseries(cursor, statistic, has_levels, completeness_qc_param):
    global error
    global error_bool
    global n0
    global n_times
    global cycles
    global d

    d['error_x'] = 'null'
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
        fbar = row['fbar']
        obar = row['obar']
        n0.append(int(row['N0']))
        n_times.append(int(row['N_times']))

        if row_idx < len(query_data) - 1:
            time_diff = int(query_data[row_idx + 1]['avtime']) - int(row['avtime'])
            time_interval = time_diff if time_diff < time_interval else time_interval

        if fbar != "null" and fbar != "NULL" and obar != "null" and obar != "NULL":
            try:
                sub_fbar = np.array([float(i) for i in (str(row['sub_fbar']).split(','))])
                sub_obar = np.array([float(i) for i in (str(row['sub_obar']).split(','))])
                sub_ffbar = np.array([float(i) for i in (str(row['sub_ffbar']).split(','))])
                sub_oobar = np.array([float(i) for i in (str(row['sub_oobar']).split(','))])
                sub_fobar = np.array([float(i) for i in (str(row['sub_fobar']).split(','))])
                sub_total = np.array([float(i) for i in (str(row['sub_total']).split(','))])
                sub_secs = np.array([float(i) for i in (str(row['sub_secs']).split(','))])
                if has_levels:
                    sub_levs_raw = str(row['sub_levs']).split(',')
                    if is_number(sub_levs_raw[0]):
                        sub_levs = np.array([int(i) for i in sub_levs])
                    else:
                        sub_levs = np.array(sub_levs_raw)
            except KeyError as e:
                error = "Error in parseQueryDataTimeSeries. The expected fields don't seem to be present " \
                        "in the results cache: " + str(e)
                error_bool = True
                return
            sub_values, stat = calculate_stat(statistic, sub_fbar, sub_obar, sub_ffbar, sub_oobar, sub_fobar, sub_total)
        else:
            stat = 'null'
            sub_values = np.nan
            sub_secs = np.nan
            if has_levels:
                sub_levs = np.nan

        curve_times.append(av_time)
        curve_stats.append(stat)
        sub_vals_all.append(sub_values)
        sub_secs_all.append(sub_secs)
        if has_levels:
            sub_levs_all.append(sub_levs)

    n0_max = max(n0)
    n_times_max = max(n_times)

    xmin = query_data[0]['avtime'] * 1000 if xmin < query_data[0]['avtime'] * 1000 else xmin

    time_interval = time_interval * 1000
    loop_time = xmin
    loop_sum = 0

    while loop_time <= xmax:
        if loop_time not in curve_times:
            if has_levels:
                d['x'].append(loop_time)
                d['y'].append('null')
                d['error_y'].append('null')
                d['subVals'].append(np.nan)
                d['subSecs'].append(np.nan)
                d['subLevs'].append(np.nan)
            else:
                d['x'].append(loop_time)
                d['y'].append('null')
                d['error_y'].append('null')
                d['subVals'].append(np.nan)
                d['subSecs'].append(np.nan)
        else:
            d_idx = curve_times.index(loop_time)
            this_n0 = n0[d_idx]
            this_n_times = n_times[d_idx]
            if this_n0 < 0.1 * n0_max or this_n_times < float(completeness_qc_param) * n_times_max:
                if has_levels:
                    d['x'].append(loop_time)
                    d['y'].append('null')
                    d['error_y'].append('null')
                    d['subVals'].append(np.nan)
                    d['subSecs'].append(np.nan)
                    d['subLevs'].append(np.nan)
                else:
                    d['x'].append(loop_time)
                    d['y'].append('null')
                    d['error_y'].append('null')
                    d['subVals'].append(np.nan)
                    d['subSecs'].append(np.nan)

            else:
                loop_sum += curve_stats[d_idx]
                if has_levels:
                    d['x'].append(loop_time)
                    d['y'].append(curve_stats[d_idx])
                    d['error_y'].append('null')
                    d['subVals'].append(sub_vals_all[d_idx])
                    d['subSecs'].append(sub_secs_all[d_idx])
                    d['subLevs'].append(sub_levs_all[d_idx])
                else:
                    d['x'].append(loop_time)
                    d['y'].append(curve_stats[d_idx])
                    d['error_y'].append('null')
                    d['subVals'].append(sub_vals_all[d_idx])
                    d['subSecs'].append(sub_secs_all[d_idx])

        loop_time = loop_time + time_interval

    cycles = [time_interval]

    d['xmin'] = min(x for x in d['x'] if is_number(x))
    d['xmax'] = max(x for x in d['x'] if is_number(x))
    d['ymin'] = min(y for y in d['y'] if is_number(y))
    d['ymax'] = max(y for y in d['y'] if is_number(y))
    d['sum'] = loop_sum


def query_db(cnx, cursor, statement, statistic, plot_type, has_levels, completeness_qc_param):
    global d
    global n0
    global n_times
    global cycles
    global error
    global error_bool

    try:
        cursor.execute(statement)
    except MySQLdb.Error as e:
        error = "Error executing query: " + str(e)
        error_bool = True

    if not error_bool:
        if cursor.rowcount == 0:
            error = "NO_DATA_FOUND"
            error_bool = True
        else:
            if plot_type == 'TimeSeries':
                parse_query_data_timeseries(cursor, statistic, has_levels, completeness_qc_param)


def main(args):
    global error_bool
    cnx, cursor = connect_to_mysql()
    if not error_bool:
        query_db(cnx, cursor, args[1], args[2], args[3], args[4], args[5])
    if not error_bool:
        disconnect_mysql(cnx, cursor)


if __name__ == '__main__':
    # needed js args: [1] statement, [2] statistic, [3] plotType, [4] hasLevels, [5] completenessQCParam
    utc_now = str(datetime.now())
    msg = 'Calling python query function at: ' + utc_now
    print(msg)
    main(sys.argv)
    utc_now = str(datetime.now())
    msg = 'Returning results from python query function at: ' + utc_now
    print(msg)
