SELECT unix_timestamp(m0.date)+3600*m0.hour AS avtime,
        COUNT(DISTINCT unix_timestamp(m0.date)+3600*m0.hour) AS N_times,
        MIN(unix_timestamp(m0.date)+3600*m0.hour) AS min_secs,
        MAX(unix_timestamp(m0.date)+3600*m0.hour) AS max_secs,
        SUM({{variable0}}) AS square_diff_sum,
        SUM({{variable1}}) AS N_sum,
        SUM({{variable2}}) AS obs_model_diff_sum,
        SUM({{variable3}}) AS model_sum,
        SUM({{variable4}}) AS obs_sum,
        SUM({{variable5}}) AS abs_sum,
        COUNT({{variable0}}) AS N0
    FROM {{database}}.{{model}}{{region}} AS m0
    WHERE 1=1
        AND unix_timestamp(m0.date)+3600*m0.hour >= {{fromSecs}}
        AND unix_timestamp(m0.date)+3600*m0.hour <= {{toSecs}}
        AND m0.hour IN({{validTimes}})
        AND m0.fcst_len = {{forecastLength}}
        AND m0.mb10*10 = {{level}}
    GROUP BY avtime
    ORDER BY avtime;
