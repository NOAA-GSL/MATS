DELIMITER |

UPDATE line_data_cnt
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

  UPDATE line_data_ctc
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

    UPDATE line_data_cts
    SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
      fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
      fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
      obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
      obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

  UPDATE line_data_enscnt
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

 UPDATE line_data_fho
 SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
   fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
   fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
   obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
   obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

   UPDATE line_data_isc
   SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
     fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
     fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
     obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
     obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

  UPDATE line_data_mctc
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

    UPDATE line_data_mcts
    SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
      fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
      fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
      obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
      obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


  UPDATE line_data_mpr
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


  UPDATE line_data_nbrcnt
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


  UPDATE line_data_nbrctc
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


  UPDATE line_data_nbrcts
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


  UPDATE line_data_orank
  SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
    fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
    fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
    obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
    obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


UPDATE line_data_pct
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

UPDATE line_data_phist
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


UPDATE line_data_pjc
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|



UPDATE line_data_prc
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


UPDATE line_data_pstd
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


UPDATE line_data_cnt
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

  UPDATE line_data_rhist
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


UPDATE line_data_sal1l2
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

UPDATE line_data_sl1l2
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

UPDATE line_data_ssvar
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

UPDATE line_data_val1l2
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|


UPDATE line_data_vl1l2
SET fcst_valid_beg = DATE_SUB(fcst_valid_beg, INTERVAL fcst_lead HOUR),
  fcst_valid_end= DATE_SUB(fcst_valid_end, INTERVAL fcst_lead HOUR),
  fcst_init_beg= DATE_SUB(fcst_init_beg, INTERVAL fcst_lead HOUR),
  obs_valid_beg= DATE_SUB(obs_valid_beg, INTERVAL fcst_lead HOUR),
  obs_valid_end= DATE_SUB(obs_valid_end, INTERVAL fcst_lead HOUR)|

  DROP FUNCTION IF EXISTS calcME2 |
  CREATE FUNCTION calcME2 (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
  BEGIN
    DECLARE me REAL;
    SET me = calcME(total , fbar , obar , fobar , ffbar , oobar );
  RETURN  (me * me); END |

  DROP FUNCTION IF EXISTS calcMSESS |
  CREATE FUNCTION calcMSESS (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
  BEGIN
      DECLARE ostdev REAL;
      DECLARE mse REAL;
      SET ostdev=calcOSTDEV(total , fbar , obar , fobar , ffbar , oobar );
      SET mse=calcMSE(total , fbar , obar , fobar , ffbar , oobar );
  RETURN (1.0 - mse/(ostdev*ostdev) ); END |

  CREATE FUNCTION calcANOM_CORR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
  BEGIN
      DECLARE v REAL;
      DECLARE anom_corr REAL;
      SET v = (POW(total,2) * ffbar - POW(total,2) * POW(fbar,2)) * (POW(total,2) * oobar - POW(total,2) * POW(obar,2));
      IF 0 >= v THEN RETURN 'NA'; END IF;
      SET anom_corr = (POW(total,2) * fobar - POW(total,2) * fbar * obar) / SQRT(v);
      IF 1 < anom_corr THEN RETURN 'NA'; END IF;
      RETURN anom_corr;
  END |

DELIMITER ;