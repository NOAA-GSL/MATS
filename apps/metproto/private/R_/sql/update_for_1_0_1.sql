DELIMITER |
INSERT INTO data_file_lu  VALUES(6,'vsdb_point_stat', 'Verification statistics for forecasts at observation points for vsdb files')|

ALTER TABLE line_data_nbrcts ADD lodds DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD lodds_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    lodds_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    lodds_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    lodds_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_nbrcts ADD    orss DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    orss_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    orss_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    orss_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    orss_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_nbrcts ADD    eds DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    eds_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    eds_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    eds_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    eds_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_nbrcts ADD    seds DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    seds_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    seds_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    seds_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    seds_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_nbrcts ADD    edi DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    edi_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    edi_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    edi_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    edi_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_nbrcts ADD    sedi DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    sedi_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    sedi_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    sedi_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    sedi_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_nbrcts ADD    bagss DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    bagss_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcts ADD    bagss_bcu DOUBLE DEFAULT -9999|

DROP FUNCTION IF EXISTS calcMAE |
CREATE FUNCTION calcMAE ( mae REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF mae = -9999 THEN RETURN 'NA'; END IF; RETURN FORMAT( mae, 4 ); END |


DELIMITER ;