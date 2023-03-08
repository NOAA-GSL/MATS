SELECT unix_timestamp(m0.date)+3600*m0.hour AS avtime,
        SUM({{variable0}}) AS square_diff_sum,
        SUM({{variable1}}) AS N_sum,
        SUM({{variable2}}) AS obs_model_diff_sum,
        SUM({{variable3}}) AS model_sum,
        SUM({{variable4}}) AS obs_sum,
        SUM({{variable5}}) AS abs_sum
    FROM {{database}}.{{model}}{{region}} AS m0
    WHERE 1=1
        AND unix_timestamp(m0.date)+3600*m0.hour >= {{fromSecs}}
        AND unix_timestamp(m0.date)+3600*m0.hour <= {{toSecs}}
        AND m0.hour IN({{validTimes}})
        AND m0.fcst_len = {{forecastLength}}
        AND m0.mb10*10 = {{level}}
    GROUP BY avtime
    ORDER BY avtime;
