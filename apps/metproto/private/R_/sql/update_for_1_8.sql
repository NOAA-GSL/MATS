DELIMITER |

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

DROP FUNCTION IF EXISTS calcANOM_CORR |
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