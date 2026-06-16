       SUM(m0.data.['{{vxTHRESHOLDX}}'].hits) hitX,
       SUM(m0.data.['{{vxTHRESHOLDX}}'].false_alarmsX) faX,
       SUM(m0.data.['{{vxTHRESHOLDX}}'].missesX) missX,
       SUM(m0.data.['{{vxTHRESHOLDX}}'].correct_negatives) cnX,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].hits) hitY,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].false_alarms) faY,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].misses) missY,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].correct_negatives) cnY,
       ARRAY_SORT( ARRAY_AGG( CASE WHEN m0.fcstValidEpoch IS NOT NULL THEN TO_STRING(m0.fcstValidEpoch) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].hits IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].hits) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].false_alarms IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].false_alarms) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].misses IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].misses) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDX}}'].correct_negatives IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDX}}'].correct_negatives) ELSE "NULL" END
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].hits IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].hits) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].false_alarms IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].false_alarms) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].misses IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].misses) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].correct_negatives IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].correct_negatives) ELSE "NULL" END ) ) sub_data,
       COUNT(m0.data.['{{vxTHRESHOLDX}}'].hits) n0
