       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum2_diff) square_diff_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].num_recs) N_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_diff * -1) obs_model_diff_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_model) model_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_obs) obs_sum,
       SUM(m0.data.['{{vxSUBVARIABLE}}'].sum_abs) abs_sum,
       ARRAY_SORT( ARRAY_AGG( CASE WHEN m0.fcstValidEpoch IS NOT NULL THEN TO_STRING(m0.fcstValidEpoch) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLE}}'].sum2_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum2_diff) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLE}}'].num_recs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].num_recs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLE}}'].sum_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_diff * -1) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLE}}'].sum_model IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_model) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLE}}'].sum_obs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_obs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLE}}'].sum_abs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLE}}'].sum_abs) ELSE "NULL" END  ) ) sub_data,
       COUNT(m0.data.['{{vxSUBVARIABLE}}'].sum2_diff) N0
