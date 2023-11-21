       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum2_diff) square_diff_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].num_recs) N_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_diff * -1) obs_model_diff_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_model) model_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_obs) obs_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_abs) abs_sum,
       ARRAY_SORT( ARRAY_AGG( TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum2_diff) || ';' || TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].num_recs) || ';' || TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_diff * -1) || ';' || TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_model) || ';' || TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_obs) || ';' || TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_abs) ) ) sub_data,
       COUNT(m0.data.['{{vxSUBVARIABLE}}'].sum2_diff) N0
