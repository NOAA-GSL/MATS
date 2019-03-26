import sys
import MySQLdb
import math
import numpy as np
import json
from datetime import datetime

error_bool = False  # global variable to keep track of whether we've had an error
error = ""  # one of the four fields to return at the end -- records any error message
n0 = []  # one of the four fields to return at the end -- number of sub_values for each independent variable
n_times = []  # one of the four fields to return at the end -- number of sub_secs for each independent variable
data = {  # one of the four fields to return at the end -- the parsed data structure
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
output_JSON = {}  # JSON structure to pass the five output fields back to the MATS JS


# function to open a connection to a mysql database
def connect_to_mysql(mysql_conf_path):
    global error, error_bool
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
    global error, error_bool
    try:
        cursor.close()
        cnx.close()
    except MySQLdb.Error as e:
        error = "Error disconnecting from db: " + str(e)
        error_bool = True


# function for constructing and jsonifying a dictionary of the output variables
def construct_output_json():
    global output_JSON, error, n0, n_times, data
    output_JSON = {
        "data": data,
        "N0": n0,
        "N_times": n_times,
        "error": error
    }
    output_JSON = json.dumps(output_JSON)


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


# function for calculating anomaly correlation from MET partial sums
def calculate_acc(fbar, obar, ffbar, oobar, fobar, total):
    global error, error_bool
    try:
        denom = (np.power(total, 2) * ffbar - np.power(total, 2) * np.power(fbar, 2)) \
                * (np.power(total, 2) * oobar - np.power(total, 2) * np.power(obar, 2))
        acc = (np.power(total, 2) * fobar - np.power(total, 2) * fbar * obar) / np.sqrt(denom)
    except TypeError as e:
        error = "Error calculating RMS: " + str(e)
        error_bool = True
        acc = np.empty(len(ffbar))
    except ValueError as e:
        error = "Error calculating RMS: " + str(e)
        error_bool = True
        acc = np.empty(len(ffbar))
    return acc


# function for calculating RMS from MET partial sums
def calculate_rms(ffbar, oobar, fobar):
    global error, error_bool
    try:
        rms = np.sqrt(ffbar + oobar - 2 * fobar)
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
    global error, error_bool
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
    global error, error_bool
    stat_switch = {  # dispatcher of statistical calculation functions
        'ACC': calculate_acc,
        'RMS': calculate_rms,
        'Bias (Model - Obs)': calculate_bias,
        'N': calculate_n,
        'Model average': calculate_m_avg,
        'Obs average': calculate_o_avg
    }
    args_switch = {  # dispatcher of arguments for statistical calculation functions
        'ACC': (fbar, obar, ffbar, oobar, fobar, total),
        'RMS': (ffbar, oobar, fobar),
        'Bias (Model - Obs)': (fbar, obar),
        'N': (total,),
        'Model average': (fbar,),
        'Obs average': (obar,)
    }
    try:
        stat_args = args_switch[statistic]  # get args
        sub_stats = stat_switch[statistic](*stat_args)  # call stat function
        stat = np.nanmean(sub_stats)  # calculate overall stat
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


# function for processing the sub-values from the query and calling calculate_stat
def get_scalar_stat(has_levels, row, statistic):
    global error, error_bool
    try:
        # get all of the partial sums for each time
        # fbar, obar, ffbar, fobar, and oobar may have different names in different partial sums tables,
        # but we're using these names for all scalar sums in order to have common code.
        # METviewer also does this variable name fudging, I checked.
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
                sub_levs = np.array([int(i) for i in sub_levs_raw])
            else:
                sub_levs = np.array(sub_levs_raw)
        else:
            sub_levs = np.empty(len(sub_secs))
    except KeyError as e:
        error = "Error parsing query data. The expected fields don't seem to be present " \
                "in the results cache: " + str(e)
        error_bool = True
        # if we don't have the data we expect just stop now and return empty data objects
        return np.nan, np.empty(0), np.empty(0), np.empty(0)
    # if we do have the data we expect, calculate the requested statistic
    sub_values, stat = calculate_stat(statistic, sub_fbar, sub_obar, sub_ffbar, sub_oobar, sub_fobar, sub_total)
    return stat, sub_levs, sub_secs, sub_values


#  function for calculating the interval between the current time and the next time for models with irregular vts
def get_time_interval(curr_time, time_interval, vts):
    full_day = 24 * 3600 * 1000
    first_vt = min(vts)
    this_vt = curr_time % full_day  # current time we're on

    if this_vt in vts:
        # find our where the current time is in the vt array
        this_vt_idx = vts.index(this_vt)
        # choose the next vt
        next_vt_idx = this_vt_idx + 1
        if next_vt_idx >= len(vts):
            # if we were at the last vt, wrap back around to the first vt
            ti = (full_day - this_vt) + first_vt
        else:
            # otherwise take the difference between the current and next vts.
            ti = vts[next_vt_idx] - vts[this_vt_idx]
    else:
        # if for some reason the current vt isn't in the vts array, default to the regular interval
        ti = time_interval

    return ti


# function for parsing the data returned by a timeseries query
def parse_query_data_timeseries(cursor, statistic, has_levels, completeness_qc_param, vts):
    global error, error_bool, n0, n_times, data

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
    regular = len(vts) == 0

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

        if row_idx < len(query_data) - 1:  # make sure we have the smallest time interval for the while loop later
            time_diff = int(query_data[row_idx + 1]['avtime']) - int(row['avtime'])
            time_interval = time_diff if time_diff < time_interval else time_interval

        if fbar != "null" and fbar != "NULL" and obar != "null" and obar != "NULL":
            # this function deals with sl1l2 and sal1l2 tables, which is all we have at the moment.
            # other functions can be written for other table types
            stat, sub_levs, sub_secs, sub_values = get_scalar_stat(has_levels, row, statistic)
            # if the previous function failed because we don't have the data we expect,
            # just stop now and return an empty data object.
            if np.isnan(stat):
                return
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
            data['subVals'].append(
                'NaN')  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
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
                data['subVals'].append(
                    'NaN')  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
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

        if not regular:
            # vts are giving us an irregular cadence, so the interval most likely will not be the one calculated above
            time_interval = get_time_interval(loop_time, time_interval, vts)
        loop_time = loop_time + time_interval

    data['xmin'] = min(x for x in data['x'] if is_number(x))
    data['xmax'] = max(x for x in data['x'] if is_number(x))
    data['ymin'] = min(y for y in data['y'] if is_number(y))
    data['ymax'] = max(y for y in data['y'] if is_number(y))
    data['sum'] = loop_sum


# function for parsing the data returned by a profile/dieoff/validtime/threshold etc query
def parse_query_data_specialty_curve(cursor, statistic, plot_type, has_levels, completeness_qc_param):
    global error, error_bool, n0, n_times, data

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
            # this function deals with sl1l2 and sal1l2 tables, which is all we have at the moment.
            # other functions can be written for other table types
            stat, sub_levs, sub_secs, sub_values = get_scalar_stat(has_levels, row, statistic)
            # if the previous function failed because we don't have the data we expect,
            # just stop now and return an empty data object.
            if np.isnan(stat):
                return
        else:
            # there's no data at this time point
            stat = 'null'
            sub_values = 'NaN'  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
            sub_secs = 'NaN'
            if has_levels:
                sub_levs = 'NaN'

        # deal with missing forecast cycles for dailyModelCycle plot type
        if plot_type == 'DailyModelCycle' and row_idx > 0 and (
                int(ind_var) - int(query_data[row_idx - 1]['avtime'] * 1000)) > 3600 * 24 * 1000:
            cycles_missing = math.floor(
                int(ind_var) - int(query_data[row_idx - 1]['avtime'] * 1000) / (3600 * 24 * 1000))
            for missing_cycle in reversed(range(1, cycles_missing + 1)):
                curve_ind_vars.append(ind_var - 3600 * 24 * 1000 * missing_cycle)
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
                data['subVals'].append(
                    'NaN')  # These are string NaNs instead of numerical NaNs because the JSON encoder can't figure out what to do with np.nan or float('nan')
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


# function for parsing the data returned by a histogram query
def parse_query_data_histogram(cursor, statistic, has_levels, completeness_qc_param):
    global error, error_bool, n0, n_times, data

    sub_vals_all = []
    sub_secs_all = []
    sub_levs_all = []

    # get query data and calculate starting time interval of the returned data
    query_data = cursor.fetchall()

    # loop through the query results and store the returned values
    for row in query_data:
        fbar = row['fbar']
        obar = row['obar']
        n0.append(int(row['N0']))
        n_times.append(int(row['N_times']))

        if fbar != "null" and fbar != "NULL" and obar != "null" and obar != "NULL":
            # this function deals with sl1l2 and sal1l2 tables, which is all we have at the moment.
            # other functions can be written for other table types
            stat, sub_levs, sub_secs, sub_values = get_scalar_stat(has_levels, row, statistic)
            # if the previous function failed because we don't have the data we expect,
            # just stop now and return an empty data object.
            if np.isnan(stat):
                return
            # JSON can't deal with numpy nans in subarrays for some reason, so we remove them
            if np.isnan(sub_values).any():
                bad_value_indices = np.argwhere(np.isnan(sub_values))
                sub_values = np.delete(sub_values, bad_value_indices)
                sub_secs = np.delete(sub_secs, bad_value_indices)
                if has_levels:
                    sub_levs = np.delete(sub_levs, bad_value_indices)

            # store parsed data for later
            sub_vals_all.append(sub_values)
            sub_secs_all.append(sub_secs)
            if has_levels:
                sub_levs_all.append(sub_levs)

    # we don't have bins yet, so we want all of the data in one array
    data['subVals'] = [item for sublist in sub_vals_all for item in sublist]
    data['subSecs'] = [item for sublist in sub_secs_all for item in sublist]
    if has_levels:
        data['subLevs'] = [item for sublist in sub_levs_all for item in sublist]

# function for parsing the data returned by a reliability query
def parse_query_data_reliability(cursor, has_levels):
    global error, error_bool, n0, n_times, data

    # redefine the data array to include the fields needed for reliability plots

    threshold_all = []
    oy_all = []
    on_all = []
    hit_rate = []
    total_times = []
    total_values = []

    observed_total = 0
    forecast_total = 0

    # get query data and calculate starting time interval of the returned data
    query_data = cursor.fetchall()

    # loop through the query results and store the returned values
    for row in query_data:
        bin_number = int(row['bin_number'])
        threshold = row['threshold']
        oy = int(row['oy_i'])
        on = int(row['on_i'])
        times = int(row['N_times'])
        values = int(row['N0'])
        #n0.append(int(row['N0']))
        #n_times.append(int(row['N_times']))

        #print(bin_number)

        if bin_number != "null" and threshold != "NULL" and oy != "null" and on != "NULL" and times != "NULL" and values != "NULL":
            # this function deals with pct and pct_thresh tables
            # we must add up all of the observed and not-observed values for each probability bin

            observed_total = observed_total + oy
            forecast_total = forecast_total + oy + on

            if len(oy_all) < bin_number:
                oy_all.append(oy)
            else:
                oy_all[bin_number-1] = oy_all[bin_number-1] + oy
            if len(on_all) < bin_number:
                on_all.append(on)
            else:
                on_all[bin_number-1] = on_all[bin_number-1] + on
            if len(total_times) < bin_number:
                total_times.append(on)
            else:
                total_times[bin_number-1] = total_times[bin_number-1] + times
            if len(total_values) < bin_number:
                total_values.append(on)
            else:
                total_values[bin_number-1] = total_values[bin_number-1] + values
            #print(oy_all[bin_number-1])
            #print(on_all[bin_number-1])
            if len(threshold_all) < bin_number:
                threshold_all.append(threshold)
            else:
                continue

    #print(threshold_all)
    # Now, we must determine the hit rate for each probability bin
    for i in range (0, len(threshold_all), 1):
        #print('THRESH: '+str(threshold_all[i]))
        #print('OY: '+str(oy_all[i]))
        #print('ON: '+str(on_all[i]))
        try:
            hr = float(oy_all[i]) / (float(oy_all[i]) + float(on_all[i]))
        except ZeroDivisionError:
            hr = None
        #print('HR: '+str(hr))
        hit_rate.append(hr)

    # calculate the sample climatology
    sample_climo = float(observed_total) / float(forecast_total)

    # Since everything is combined already, put it into the data structure
    n0 = total_values
    n_times = total_times
    data['x'] = threshold_all
    data['y'] = hit_rate
    data['subVals'] = sample_climo
    data['error_x'] = oy_all
    data['error_y'] = on_all
    data['xmax'] = 1.0
    data['xmin'] = 0.0
    data['ymax'] = 1.0
    data['ymin'] = 0.0


# function for parsing the data returned by a contour query
def parse_query_data_contour(cursor, statistic, has_levels):
    global error, error_bool, n0, n_times, data

    # redefine the data array to include the fields needed for contour plots
    data = {
        "x": [],
        "y": [],
        "z": [],
        "n": [],
        "text": [],
        "xTextOutput": [],
        "yTextOutput": [],
        "zTextOutput": [],
        "nTextOutput": [],
        "minDateTextOutput": [],
        "maxDateTextOutput": [],
        "glob_stats": {},
        "xmin": sys.float_info.max,
        "xmax": -1 * sys.float_info.max,
        "ymin": sys.float_info.max,
        "ymax": -1 * sys.float_info.max,
        "zmin": sys.float_info.max,
        "zmax": -1 * sys.float_info.max,
        "sum": 0
    }

    curve_stat_lookup = {}
    curve_n_lookup = {}

    # get query data
    query_data = cursor.fetchall()

    # loop through the query results and store the returned values
    for row in query_data:
        row_x_val = float(str(row['xVal']).replace('P', ''))    # if it's a pressure level get rid of the P in front of the value
        row_y_val = float(str(row['yVal']).replace('P', ''))    # if it's a pressure level get rid of the P in front of the value
        stat_key = str(row_x_val) + '_' + str(row_y_val)
        fbar = row['sub_fbar']
        obar = row['sub_obar']
        if fbar != "null" and fbar != "NULL" and obar != "null" and obar != "NULL":
            # this function deals with sl1l2 and sal1l2 tables, which is all we have at the moment.
            # other functions can be written for other table types
            stat, sub_levs, sub_secs, sub_values = get_scalar_stat(has_levels, row, statistic)
            # if the previous function failed because we don't have the data we expect,
            # just stop now and return an empty data object.
            if np.isnan(stat):
                return
            n = row['n']
            min_date = row['min_secs']
            max_date = row['max_secs']
        else:
            # there's no data at this time point
            stat = 'null'
            n = 0
            min_date = 'null'
            max_date = 'null'
        # store flat arrays of all the parsed data, used by the text output and for some calculations later
        data['xTextOutput'].append(row_x_val)
        data['yTextOutput'].append(row_y_val)
        data['zTextOutput'].append(stat)
        data['nTextOutput'].append(n)
        data['minDateTextOutput'].append(min_date)
        data['maxDateTextOutput'].append(max_date)
        curve_stat_lookup[stat_key] = stat
        curve_n_lookup[stat_key] = n

    # get the unique x and y values and sort the stats into the 2D z array accordingly
    data['x'] = sorted(list(set(data['xTextOutput'])))
    data['y'] = sorted(list(set(data['yTextOutput'])))

    loop_sum = 0
    n_points = 0
    for curr_y in data['y']:
        curr_y_stat_array = []
        curr_y_n_array = []
        for curr_x in data['x']:
            curr_stat_key = str(curr_x) + '_' + str(curr_y)
            if curr_stat_key in curve_stat_lookup:
                curr_stat = curve_stat_lookup[curr_stat_key]
                curr_n = curve_n_lookup[curr_stat_key]
                loop_sum = loop_sum + curr_stat
                n_points = n_points + 1
                curr_y_stat_array.append(curr_stat)
                curr_y_n_array.append(curr_n)
            else:
                curr_y_stat_array.append('null')
                curr_y_n_array.append(0)
        data['z'].append(curr_y_stat_array)
        data['n'].append(curr_y_n_array)

    # calculate statistics
    data['xmin'] = min(x for x in data['x'] if x != 'null' and x != 'NaN')
    data['xmax'] = max(x for x in data['x'] if x != 'null' and x != 'NaN')
    data['ymin'] = min(y for y in data['y'] if y != 'null' and y != 'NaN')
    data['ymax'] = max(y for y in data['y'] if y != 'null' and y != 'NaN')
    data['zmin'] = min(min(z) for z in data['z'] if z != 'null' and z != 'NaN')
    data['zmax'] = max(max(z) for z in data['z'] if z != 'null' and z != 'NaN')
    data['sum'] = loop_sum

    data['glob_stats'] = {
        "mean": 0,
        "minDate": 0,
        "maxDate": 0,
        "n": 0
    }
    data['glob_stats']['mean'] = loop_sum / n_points
    data['glob_stats']['minDate'] = min(m for m in data['minDateTextOutput'] if m != 'null' and m != 'NaN')
    data['glob_stats']['maxDate'] = max(m for m in data['minDateTextOutput'] if m != 'null' and m != 'NaN')
    data['glob_stats']['n'] = n_points


# function for querying the database and sending the returned data to the parser
def query_db(cursor, statement, statistic, plot_type, has_levels, completeness_qc_param, vts):
    global error, error_bool, n0, n_times, data

    try:
        cursor.execute(statement)
    except MySQLdb.Error as e:
        error = "Error executing query: " + str(e)
        error_bool = True

    if not error_bool:
        if cursor.rowcount == 0:
            error = "INFO:0 data records found"
            print(error)
            error_bool = True
        else:
            if plot_type == 'TimeSeries':
                if len(vts) > 0:
                    # selecting valid_times makes the cadence irregular
                    vts = vts.replace("'", "")
                    vts = vts.split(',')
                    vts = [(int(vt)) * 3600 * 1000 for vt in vts]
                    # make sure no vts are negative
                    vts = list(map((lambda vt: vt if vt >= 0 else vt + 24 * 3600 * 1000), vts))
                    # sort 'em
                    vts = sorted(vts)
                else:
                    vts = []
                parse_query_data_timeseries(cursor, statistic, has_levels, completeness_qc_param, vts)
            elif plot_type == 'Histogram':
                parse_query_data_histogram(cursor, statistic, has_levels, completeness_qc_param)
            elif plot_type == 'Contour':
                parse_query_data_contour(cursor, statistic, has_levels)
            elif plot_type == 'Reliability':
                parse_query_data_reliability(cursor, has_levels)
            else:
                parse_query_data_specialty_curve(cursor, statistic, plot_type, has_levels, completeness_qc_param)


def main(args):
    global output_JSON, error_bool
    cnx, cursor = connect_to_mysql(args[1])
    if not error_bool:
        query_db(cursor, args[2], args[3], args[4], args[5], args[6], args[7])
    construct_output_json()
    disconnect_mysql(cnx, cursor)
    print(output_JSON)


if __name__ == '__main__':
    # needed js args:
    # [1] mysql_conf_path, [2] statement, [3] statistic, [4] plotType, [5] hasLevels, [6] completenessQCParam, [7] vts
    utc_now = str(datetime.now())
    msg = 'Calling python query function at: ' + utc_now
    # print(msg)
    main(sys.argv)
    utc_now = str(datetime.now())
    msg = 'Returning results from python query function at: ' + utc_now
    # print(msg)
