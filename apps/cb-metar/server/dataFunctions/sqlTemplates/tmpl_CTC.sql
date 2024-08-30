       SUM(m0.data.['{{vxTHRESHOLD}}'].hits) hit,
       SUM(m0.data.['{{vxTHRESHOLD}}'].false_alarms) fa,
       SUM(m0.data.['{{vxTHRESHOLD}}'].misses) miss,
       SUM(m0.data.['{{vxTHRESHOLD}}'].correct_negatives) cn,
       ARRAY_SORT( ARRAY_AGG( CASE WHEN m0.fcstValidEpoch IS NOT NULL THEN TO_STRING(m0.fcstValidEpoch) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLD}}'].hits IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLD}}'].hits) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLD}}'].false_alarms IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLD}}'].false_alarms) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLD}}'].misses IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLD}}'].misses) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLD}}'].correct_negatives IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLD}}'].correct_negatives) ELSE "NULL" END ) ) sub_data,
       COUNT(m0.data.['{{vxTHRESHOLD}}'].hits) n0
