SELECT m0.secs AS avtime,
        SUM({{variable0}}) AS square_diff_sum,
        SUM({{variable1}}) AS N_sum,
        SUM({{variable2}}) AS obs_model_diff_sum,
        SUM({{variable3}}) AS model_sum,
        SUM({{variable4}}) AS obs_sum,
        SUM({{variable5}}) AS abs_sum
    FROM {{database}}.{{model}}_site_{{region}} AS m0
    WHERE 1=1
        AND m0.secs >= {{fromSecs}}
        AND m0.secs <= {{toSecs}}
        AND floor((m0.secs)%(24*3600)/3600) IN({{validTimes}})
        AND m0.fcst_len = {{forecastLength}} * 60
        AND m0.scale = {{grid_scale}}
    GROUP BY avtime
    ORDER BY avtime;
