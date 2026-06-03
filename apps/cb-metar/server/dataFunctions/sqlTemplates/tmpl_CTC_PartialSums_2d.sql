       SUM(m0.data.['{{vxTHRESHOLDX}}'].hits) hitX,
       SUM(m0.data.['{{vxTHRESHOLDX}}'].false_alarmsX) faX,
       SUM(m0.data.['{{vxTHRESHOLDX}}'].missesX) missX,
       SUM(m0.data.['{{vxTHRESHOLDX}}'].correct_negatives) cnX,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum2_diff) square_diff_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].num_recs) N_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_diff * -1) obs_model_diff_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_model) model_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_obs) obs_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_abs) abs_sumY,
       ARRAY_SORT( ARRAY_AGG( CASE WHEN m0.fcstValidEpoch IS NOT NULL THEN TO_STRING(m0.fcstValidEpoch) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].hits IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].hits) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].false_alarms IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].false_alarms) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].misses IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].misses) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].correct_negatives IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].correct_negatives) ELSE "NULL" END
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum2_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum2_diff) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].num_recs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].num_recs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_diff * -1) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_model IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_model) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_obs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_obs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_abs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_abs) ELSE "NULL" END  ) ) sub_data,
       COUNT(m0.data.['{{vxTHRESHOLDX}}'].hits) n0
