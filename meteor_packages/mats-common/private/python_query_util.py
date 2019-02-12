import sys
import MySQLdb
import math
import numpy as np
import json
from datetime import datetime

error_bool = False  # global variable to keep track of whether we've had an error
error = ""          # one of the five fields to return at the end -- records any error message
n0 = []             # one of the five fields to return at the end -- number of sub_values for each independent variable
n_times = []        # one of the five fields to return at the end -- number of sub_secs for each independent variable
cycles = []         # one of the five fields to return at the end -- model cadence (only used for timeseries)
data = {               # one of the five fields to return at the end -- the parsed data structure
    "x": [],
    "y": [],
    "error_x": [],
    "error_y": [],
    "subVals": [],
    "subSecs": [],
    "subLevs": [],
    "stats": [],
    "text": [],
    "xmin": sys.float_info.max,
    "xmax": -1 * sys.float_info.max,
    "ymin": sys.float_info.max,
    "ymax": -1 * sys.float_info.max,
    "sum": 0
}
output_JSON = {}    # JSON structure to pass the five output fields back to the MATS JS


# function to check if a certain value is a float or int
def is_number(s):
    try:
        if np.isnan(s):
            return False
    except TypeError:
        return False
    try:
        float(s)
        return True
    except ValueError:
        return False


# function to open a connection to a mysql database
def connect_to_mysql(mysql_conf_path):
    global error
    global error_bool
    try:
        cnx = MySQLdb.connect(read_default_file=mysql_conf_path)
        cnx.autocommit = True
        cursor = cnx.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('set group_concat_max_len = 4294967295')
        return cnx, cursor
    except MySQLdb.Error as e:
        error = "Error connecting to db: " + str(e)
        error_bool = True


# function for closing a connection to a mysql database
def disconnect_mysql(cnx, cursor):
    global error
    global error_bool
    try:
        cursor.close()
        cnx.close()
    except MySQLdb.Error as e:
        error = "Error disconnecting from db: " + str(e)
        error_bool = True


# function for constructing and jsonifying a dictionary of the output variables
def construct_output_json():
    global output_JSON
    global error
    global n0
    global n_times
    global cycles
    global data
    output_JSON = {
        "data": data,
        "N0": n0,
        "N_times": n_times,
        "cycles": cycles,
        "error": error
    }
    output_JSON = json.dumps(output_JSON)


# function for calculating RMS from MET partial sums
def calculate_rms(ffbar, oobar, fobar):
    global error
    global error_bool
    try:
        rms = np.sqrt(ffbar + oobar - 2*fobar)
    except TypeError as e:
        error = "Error calculating RMS: " + str(e)
        error_bool = True
        rms = np.empty(len(ffbar))
    except ValueError as e:
        error = "Error calculating RMS: " + str(e)
        error_bool = True
        rms = np.empty(len(ffbar))
    return rms


# function for calculating bias from MET partial sums
def calculate_bias(fbar, obar):
    global error
    global error_bool
    try:
        bias = fbar - obar
    except TypeError as e:
        error = "Error calculating bias: " + str(e)
        error_bool = True
        bias = np.empty(len(fbar))
    except ValueError as e:
        error = "Error calculating bias: " + str(e)
        error_bool = True
        bias = np.empty(len(fbar))
    return bias


# function for calculating N from MET partial sums
def calculate_n(total):
    return total


# function for calculating model average from MET partial sums
def calculate_m_avg(fbar):
    return fbar


# function for calculating obs average from MET partial sums
def calculate_o_avg(obar):
    return obar


# function for determining and calling the appropriate statistical calculation function
def calculate_stat(statistic, fbar, obar, ffbar, oobar, fobar, total):
    global error
    global error_bool
    stat_switch = {     # dispatcher of statistical calculation functions
        'RMS': calculate_rms,
        'Bias (Model - Obs)': calculate_bias,
        'N': calculate_n,
        'Model average': calculate_m_avg,
        'Obs average': calculate_o_avg
    }
    args_switch = {     # dispatcher of arguments for statistical calculation functions
        'RMS': (ffbar, oobar, fobar),
        'Bias (Model - Obs)': (fbar, obar),
        'N': (total,),
        'Model average': (fbar,),
        'Obs average': (obar,)
    }
    try:
        stat_args = args_switch[statistic]              # get args
        sub_stats = stat_switch[statistic](*stat_args)  # call stat function
        stat = np.nanmean(sub_stats)                    # calculate overall stat
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


# function for parsing the data returned by a timeseries query
def parse_query_data_timeseries(cursor, statistic, has_levels, completeness_qc_param):
    global error
    global error_bool
    global n0
    global n_times
    global cycles
    global data

    xmax = float("-inf")
    xmin = float("inf")
    curve_times = []
    curve_stats = []
    sub_vals_all = []
    sub_secs_all = []
    sub_levs_all = []

    # get query data and calculate starting time interval of the returned data
    query_data = cursor.fetchall()

    # default the time interval to an hour. It won't matter since it won't be used for only 0 or 1 data points.
    time_interval = int(query_data[1]['avtime']) - int(query_data[0]['avtime']) if len(query_data) > 1 else 3600

    # loop through the query results and store the returned values
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

        if row_idx < len(query_data) - 1:   # make sure we have the smallest time interval for the while loop later
            time_diff = int(query_data[row_idx + 1]['avtime']) - int(row['avtime'])
            time_interval = time_diff if time_diff < time_interval else time_interval

        if fbar != "null" and fbar != "NULL" and obar != "null" and obar != "NULL":
            try:
                # get all of the partial sums for each time
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
                # if we don't have the data we expect just stop now and return an empty data object
                return
            # if we do have the data we expect, calculate the requested statistic
            sub_values, stat = calculate_stat(statistic, sub_fbar, sub_obar, sub_ffbar, sub_oobar, sub_fobar, sub_total)
        else:
            # there's no data at this time point
            stat = 'null'
            sub_values = 'NaN'  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
            sub_secs = 'NaN'
            if has_levels:
                sub_levs = 'NaN'

        # store parsed data for later
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
        # the reason we need to loop through everything again is to add in nulls for any missing points along the
        # timeseries. The query only returns the data that it actually has.
        if loop_time not in curve_times:
            data['x'].append(loop_time)
            data['y'].append('null')
            data['error_y'].append('null')
            data['subVals'].append('NaN')  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
            data['subSecs'].append('NaN')
            if has_levels:
                data['subLevs'].append('NaN')
        else:
            d_idx = curve_times.index(loop_time)
            this_n0 = n0[d_idx]
            this_n_times = n_times[d_idx]
            # add a null if there were too many missing sub-values
            if this_n0 < 0.1 * n0_max or this_n_times < float(completeness_qc_param) * n_times_max:
                data['x'].append(loop_time)
                data['y'].append('null')
                data['error_y'].append('null')
                data['subVals'].append('NaN')  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
                data['subSecs'].append('NaN')
                if has_levels:
                    data['subLevs'].append('NaN')

            else:
                # put the data in our final data dictionary, converting the numpy arrays to lists so we can jsonify
                loop_sum += curve_stats[d_idx]
                list_vals = sub_vals_all[d_idx].tolist()
                list_secs = sub_secs_all[d_idx].tolist()
                if has_levels:
                    list_levs = sub_levs_all[d_idx].tolist()
                # JSON can't deal with numpy nans in subarrays for some reason, so we remove them
                bad_value_indices = [index for index, value in enumerate(list_vals) if not is_number(value)]
                for bad_value_index in sorted(bad_value_indices, reverse=True):
                    del list_vals[bad_value_index]
                    del list_secs[bad_value_index]
                    if has_levels:
                        del list_levs[bad_value_index]
                # store data
                data['x'].append(loop_time)
                data['y'].append(curve_stats[d_idx])
                data['error_y'].append('null')
                data['subVals'].append(list_vals)
                data['subSecs'].append(list_secs)
                if has_levels:
                    data['subLevs'].append(list_levs)

        loop_time = loop_time + time_interval

    cycles = [time_interval]

    data['xmin'] = min(x for x in data['x'] if is_number(x))
    data['xmax'] = max(x for x in data['x'] if is_number(x))
    data['ymin'] = min(y for y in data['y'] if is_number(y))
    data['ymax'] = max(y for y in data['y'] if is_number(y))
    data['sum'] = loop_sum


# function for parsing the data returned by a profile/dieoff/validtime/threshold etc query
def parse_query_data_specialty_curve(cursor, statistic, plot_type, has_levels, completeness_qc_param):
    global error
    global error_bool
    global n0
    global n_times
    global data

    curve_ind_vars = []
    curve_stats = []
    sub_vals_all = []
    sub_secs_all = []
    sub_levs_all = []

    # get query data and calculate starting time interval of the returned data
    query_data = cursor.fetchall()

    # loop through the query results and store the returned values
    for row in query_data:
        row_idx = query_data.index(row)
        if plot_type == 'ValidTime':
            ind_var = float(row['hr_of_day'])
        elif plot_type == 'Profile':
            ind_var = float(str(row['avVal']).replace('P', ''))
        elif plot_type == 'DailyModelCycle':
            ind_var = int(row['avtime']) * 1000
        else:
            ind_var = int(row['avtime'])
        fbar = row['fbar']
        obar = row['obar']
        n0.append(int(row['N0']))
        n_times.append(int(row['N_times']))

        if fbar != "null" and fbar != "NULL" and obar != "null" and obar != "NULL":
            try:
                # get all of the partial sums for each time
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
                error = "Error in parseQueryDataSpecialtyCurve. The expected fields don't seem to be present " \
                        "in the results cache: " + str(e)
                error_bool = True
                # if we don't have the data we expect just stop now and return an empty data object
                return
            # if we do have the data we expect, calculate the requested statistic
            sub_values, stat = calculate_stat(statistic, sub_fbar, sub_obar, sub_ffbar, sub_oobar, sub_fobar, sub_total)
        else:
            # there's no data at this time point
            stat = 'null'
            sub_values = 'NaN'  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
            sub_secs = 'NaN'
            if has_levels:
                sub_levs = 'NaN'

        # deal with missing forecast cycles for dailyModelCycle plot type
        if plot_type == 'DailyModelCycle' and row_idx > 0 and (int(ind_var) - int(query_data[row_idx - 1]['avtime']*1000)) > 3600*24*1000:
            cycles_missing = math.floor(int(ind_var) - int(query_data[row_idx - 1]['avtime']*1000) / (3600*24*1000))
            for missing_cycle in reversed(range(1, cycles_missing+1)):
                curve_ind_vars.append(ind_var - 3600*24*1000 * missing_cycle)
                curve_stats.append('null')
                sub_vals_all.append('NaN')
                sub_secs_all.append('NaN')
                if has_levels:
                    sub_levs_all.append('NaN')

        # store parsed data for later
        curve_ind_vars.append(ind_var)
        curve_stats.append(stat)
        sub_vals_all.append(sub_values)
        sub_secs_all.append(sub_secs)
        if has_levels:
            sub_levs_all.append(sub_levs)

    n0_max = max(n0)
    n_times_max = max(n_times)
    loop_sum = 0

    # profiles have the levels sorted as strings, not numbers. Need to fix that
    if plot_type == 'Profile':
        curve_stats = [x for _, x in sorted(zip(curve_ind_vars, curve_stats))]
        sub_vals_all = [x for _, x in sorted(zip(curve_ind_vars, sub_vals_all))]
        sub_secs_all = [x for _, x in sorted(zip(curve_ind_vars, sub_secs_all))]
        sub_levs_all = [x for _, x in sorted(zip(curve_ind_vars, sub_levs_all))]
        curve_ind_vars = sorted(curve_ind_vars)

    for ind_var in curve_ind_vars:
        # the reason we need to loop through everything again is to add in nulls
        # for any bad data points along the curve.
        d_idx = curve_ind_vars.index(ind_var)
        this_n0 = n0[d_idx]
        this_n_times = n_times[d_idx]
        # add a null if there were too many missing sub-values
        if this_n0 < 0.1 * n0_max or this_n_times < float(completeness_qc_param) * n_times_max:
            if plot_type == 'Profile':
                # profile has the stat first, and then the ind_var. The others have ind_var and then stat.
                # this is in the pattern of x-plotted-variable, y-plotted-variable.
                data['x'].append('null')
                data['y'].append(ind_var)
                data['error_x'].append('null')
                data['subVals'].append('NaN')
                data['subSecs'].append('NaN')
                data['subLevs'].append('NaN')
            elif plot_type != 'DieOff':
                # for dieoffs, we don't want to add a null for missing data. Just don't have a point for that FHR.
                data['x'].append(ind_var)
                data['y'].append('null')
                data['error_y'].append('null')
                data['subVals'].append('NaN')  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
                data['subSecs'].append('NaN')
                if has_levels:
                    data['subLevs'].append('NaN')
        else:
            # put the data in our final data dictionary, converting the numpy arrays to lists so we can jsonify
            loop_sum += curve_stats[d_idx]
            list_vals = sub_vals_all[d_idx].tolist()
            list_secs = sub_secs_all[d_idx].tolist()
            if has_levels:
                list_levs = sub_levs_all[d_idx].tolist()
            # JSON can't deal with numpy nans in subarrays for some reason, so we remove them
            bad_value_indices = [index for index, value in enumerate(list_vals) if not is_number(value)]
            for bad_value_index in sorted(bad_value_indices, reverse=True):
                del list_vals[bad_value_index]
                del list_secs[bad_value_index]
                if has_levels:
                    del list_levs[bad_value_index]
            # store data
            if plot_type == 'Profile':
                # profile has the stat first, and then the ind_var. The others have ind_var and then stat.
                # this is in the pattern of x-plotted-variable, y-plotted-variable.
                data['x'].append(curve_stats[d_idx])
                data['y'].append(ind_var)
                data['error_x'].append('null')
                data['subVals'].append(list_vals)
                data['subSecs'].append(list_secs)
                data['subLevs'].append(list_levs)
            else:
                data['x'].append(ind_var)
                data['y'].append(curve_stats[d_idx])
                data['error_y'].append('null')
                data['subVals'].append(list_vals)
                data['subSecs'].append(list_secs)
                if has_levels:
                    data['subLevs'].append(list_levs)

    data['xmin'] = min(x for x in data['x'] if is_number(x))
    data['xmax'] = max(x for x in data['x'] if is_number(x))
    data['ymin'] = min(y for y in data['y'] if is_number(y))
    data['ymax'] = max(y for y in data['y'] if is_number(y))
    data['sum'] = loop_sum


# function for querying the database and sending the returned data to the parser
def query_db(cursor, statement, statistic, plot_type, has_levels, completeness_qc_param):
    global data
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
            error = "INFO:0 data records found"
            error_bool = True
        else:
            if plot_type == 'TimeSeries':
                parse_query_data_timeseries(cursor, statistic, has_levels, completeness_qc_param)
            # elif plot_type == 'Histogram':
            #     parse_query_data_histogram(cursor, statistic, has_levels, completeness_qc_param)
            # elif plot_type == 'Map':
            #     parse_query_data_map(cursor, statistic, has_levels, completeness_qc_param)
            else:
                parse_query_data_specialty_curve(cursor, statistic, plot_type, has_levels, completeness_qc_param)


def main(args):
    global error_bool
    global output_JSON
    cnx, cursor = connect_to_mysql(args[1])
    if not error_bool:
        query_db(cursor, args[2], args[3], args[4], args[5], args[6])
    construct_output_json()
    disconnect_mysql(cnx, cursor)
    print(output_JSON)


if __name__ == '__main__':
    # needed js args: [1] statement, [2] statistic, [3] plotType, [4] hasLevels, [5] completenessQCParam
    utc_now = str(datetime.now())
    msg = 'Calling python query function at: ' + utc_now
    # print(msg)
    main(sys.argv)
    utc_now = str(datetime.now())
    msg = 'Returning results from python query function at: ' + utc_now
    # print(msg)
