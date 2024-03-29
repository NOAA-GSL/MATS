SELECT m0.valid_day + 3600 * m0.hour AS avtime,
        SUM({{variable0}}) AS square_diff_sum,
        SUM({{variable1}}) AS N_sum,
        SUM({{variable2}}) AS obs_model_diff_sum,
        SUM({{variable3}}) AS model_sum,
        SUM({{variable4}}) AS obs_sum,
        SUM({{variable5}}) AS abs_sum
    FROM {{database}}.{{model}}_{{truth}}_{{region}} AS m0
    WHERE 1=1
        AND m0.valid_day+3600*m0.hour >= {{fromSecs}}
        AND m0.valid_day+3600*m0.hour <= {{toSecs}}
        AND m0.hour IN({{validTimes}})
        AND m0.fcst_len = {{forecastLength}}
    GROUP BY avtime
    ORDER BY avtime;
