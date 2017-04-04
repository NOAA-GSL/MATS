DELIMITER |

ALTER TABLE line_data_mpr ADD obs_qc DOUBLE DEFAULT -9999|
ALTER TABLE line_data_orank ADD obs_qc DOUBLE DEFAULT -9999|

ALTER TABLE line_data_nbrcnt ADD afss DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD afss_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD afss_bcu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD ufss DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD ufss_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD ufss_bcu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD f_rate DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD f_rate_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD f_rate_bcu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD o_rate DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD o_rate_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_nbrcnt ADD o_rate_bcu DOUBLE DEFAULT -9999|


ALTER TABLE line_data_cnt ADD iqr DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD iqr_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD iqr_bcu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD mad DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD mad_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD mad_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_cts ADD lodds DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD lodds_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    lodds_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    lodds_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    lodds_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_cts ADD    orss DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    orss_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    orss_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    orss_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    orss_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_cts ADD    eds DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    eds_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    eds_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    eds_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    eds_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_cts ADD    seds DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    seds_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    seds_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    seds_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    seds_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_cts ADD    edi DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    edi_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    edi_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    edi_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    edi_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_cts ADD    sedi DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    sedi_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    sedi_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    sedi_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    sedi_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_cts ADD    bagss DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    bagss_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cts ADD    bagss_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_sal1l2 ADD    mae      DOUBLE DEFAULT -9999|
ALTER TABLE line_data_sl1l2 ADD    mae      DOUBLE DEFAULT -9999|

DROP TABLE IF EXISTS line_data_phist|
CREATE TABLE line_data_phist
(
  line_data_id INT UNSIGNED NOT NULL,
  stat_header_id INT UNSIGNED NOT NULL,
  data_file_id INT UNSIGNED NOT NULL,
  line_num INT UNSIGNED,
  fcst_lead INT UNSIGNED,
  fcst_valid_beg DATETIME,
  fcst_valid_end DATETIME,
  fcst_init_beg DATETIME,
  obs_lead INT UNSIGNED,
  obs_valid_beg DATETIME,
  obs_valid_end DATETIME,
  total INT UNSIGNED,

  bin_size DOUBLE,
  n_bin INT UNSIGNED,

  PRIMARY KEY (line_data_id),

  FOREIGN KEY (data_file_id) REFERENCES data_file (data_file_id),

  FOREIGN KEY (stat_header_id) REFERENCES stat_header (stat_header_id)
) ENGINE = MyISAM |



DROP TABLE IF EXISTS line_data_phist_bin|
CREATE TABLE line_data_phist_bin
(
    line_data_id        INT UNSIGNED NOT NULL,
    i_value             INT UNSIGNED NOT NULL,
    bin_i              INT UNSIGNED,

    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_phist_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_phist(line_data_id)
)ENGINE = MyISAM |

DELIMITER ;