DELIMITER |

--
--  Sl1l2 stat calculations
--

DROP FUNCTION IF EXISTS calcStdDev |
CREATE FUNCTION calcStdDev (vsum REAL, vsum_sq REAL, n INT) RETURNS REAL DETERMINISTIC
BEGIN
    DECLARE v DECIMAL(12,6);
    IF 1 > n THEN RETURN -1; END IF;
    SET v = (vsum_sq - vsum*vsum/n)/(n - 1);
    IF 0 > v THEN RETURN -1; END IF;
    RETURN SQRT(v);
END |

DROP FUNCTION IF EXISTS calcFBAR |
CREATE FUNCTION calcFBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN IFNULL(fbar, 'NA'); END |

DROP FUNCTION IF EXISTS calcOBAR |
CREATE FUNCTION calcOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  IFNULL(obar, 'NA'); END |

DROP FUNCTION IF EXISTS calcFSTDEV |
CREATE FUNCTION calcFSTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN calcStdDev(fbar * total, ffbar * total, total); END |

DROP FUNCTION IF EXISTS calcOSTDEV |
CREATE FUNCTION calcOSTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    RETURN calcStdDev(obar * total, oobar * total, total);
END |

DROP FUNCTION IF EXISTS calcFOBAR |
CREATE FUNCTION calcFOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  IFNULL( fobar, 'NA'); END |

DROP FUNCTION IF EXISTS calcFFBAR |
CREATE FUNCTION calcFFBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  IFNULL(ffbar, 'NA'); END |

DROP FUNCTION IF EXISTS calcOOBAR |
CREATE FUNCTION calcOOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  IFNULL(oobar, 'NA'); END |

DROP FUNCTION IF EXISTS calcMBIAS |
CREATE FUNCTION calcMBIAS (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF 0 = obar THEN RETURN 'NA'; END IF;
    SET result =(fbar / obar);
    RETURN  IFNULL( result, 'NA'); END |

DROP FUNCTION IF EXISTS calcPR_CORR |
CREATE FUNCTION calcPR_CORR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE v DECIMAL(12,6);
    DECLARE pr_corr DECIMAL(12,6);
    SET v = (POW(total,2) * ffbar - POW(total,2) * POW(fbar,2)) * (POW(total,2) * oobar - POW(total,2) * POW(obar,2));
    IF 0 >= v THEN RETURN 'NA'; END IF;
    SET pr_corr = (POW(total,2) * fobar - POW(total,2) * fbar * obar) / SQRT(v);
    IF 1 < pr_corr THEN RETURN 'NA'; END IF;
    RETURN IFNULL( pr_corr, 'NA') ;
END |

DROP FUNCTION IF EXISTS calcANOM_CORR |
CREATE FUNCTION calcANOM_CORR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE v DECIMAL(12,6);
    DECLARE anom_corr DECIMAL(12,6);
    SET v = (POW(total,2) * ffbar - POW(total,2) * POW(fbar,2)) * (POW(total,2) * oobar - POW(total,2) * POW(obar,2));
    IF 0 >= v THEN RETURN 'NA'; END IF;
    SET anom_corr = (POW(total,2) * fobar - POW(total,2) * fbar * obar) / SQRT(v);
    IF 1 < anom_corr THEN RETURN 'NA'; END IF;
    RETURN IFNULL(anom_corr, 'NA');
END |


DROP FUNCTION IF EXISTS calcME |
CREATE FUNCTION calcME (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    RETURN  IFNULL((fbar - obar), 'NA') ;
END |

DROP FUNCTION IF EXISTS calcME2 |
CREATE FUNCTION calcME2 (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE me DECIMAL(12,6);
    SET me = calcME(total , fbar , obar , fobar , ffbar , oobar );
RETURN  IFNULL((me * me), 'NA'); END |

DROP FUNCTION IF EXISTS calcMSE |
CREATE FUNCTION calcMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    RETURN IFNULL((ffbar + oobar - 2*fobar), 'NA');
END |

DROP FUNCTION IF EXISTS calcMSESS |
CREATE FUNCTION calcMSESS (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE ostdev DECIMAL(12,6);
    DECLARE mse DECIMAL(12,6);
    SET ostdev=calcOSTDEV(total , fbar , obar , fobar , ffbar , oobar );
    SET mse=calcMSE(total , fbar , obar , fobar , ffbar , oobar );
RETURN IFNULL( (1.0 - mse/(ostdev*ostdev) ), 'NA'); END |

DROP FUNCTION IF EXISTS calcRMSE |
CREATE FUNCTION calcRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE a DECIMAL(12,6);
    SET a = ffbar + oobar - 2*fobar;
    RETURN  IFNULL(SQRT(a), 'NA');
END |

DROP FUNCTION IF EXISTS calcESTDEV |
CREATE FUNCTION calcESTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    DECLARE a DECIMAL(12,6);
    DECLARE b DECIMAL(12,6);
    SET a = (fbar - obar)*total;
    SET b = (ffbar + oobar - 2*fobar)*total;
    SET result = calcStdDev(a , b , total );
    RETURN  result;
END |

DROP FUNCTION IF EXISTS calcBCMSE |
CREATE FUNCTION calcBCMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    SET result = (ffbar + oobar - 2*fobar) - POW(fbar - obar, 2);
    RETURN  IFNULL( result, 'NA');
END |

DROP FUNCTION IF EXISTS calcBCRMSE |
CREATE FUNCTION calcBCRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    SET result = SQRT((ffbar + oobar - 2*fobar) - POW(fbar - obar, 2));
    RETURN  IFNULL(result , 'NA');
END |

DROP FUNCTION IF EXISTS calcMAE |
CREATE FUNCTION calcMAE ( mae REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF mae = -9999 THEN RETURN 'NA'; END IF; RETURN  mae; END |

--
-- CTC stat calculations
--

DROP FUNCTION IF EXISTS calcBASER |
CREATE FUNCTION calcBASER (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF total = 0 THEN RETURN 'NA'; END IF;
    SET result = (fy_oy + fn_oy) / total;
    RETURN IFNULL(result , 'NA');
END |

DROP FUNCTION IF EXISTS calcACC |
CREATE FUNCTION calcACC (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF total = 0 THEN RETURN 'NA'; END IF;
    SET result = (fy_oy + fn_on) / total;
    RETURN IFNULL(result, 'NA');
END |

DROP FUNCTION IF EXISTS calcFBIAS |
CREATE FUNCTION calcFBIAS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF (fy_oy + fn_oy) = 0 THEN RETURN 'NA'; END IF;
    SET result = (fy_oy + fy_on) / (fy_oy + fn_oy);
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcPODY |
CREATE FUNCTION calcPODY (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF (fy_oy + fn_oy) = 0 THEN RETURN 'NA'; END IF;
    SET result = fy_oy / (fy_oy + fn_oy);
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcPOFD |
CREATE FUNCTION calcPOFD (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF (fy_on + fn_on) = 0 THEN RETURN 'NA'; END IF;
    SET result = fy_on / (fy_on + fn_on);
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcPODN |
CREATE FUNCTION calcPODN (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF (fy_on + fn_on) = 0 THEN RETURN 'NA'; END IF;
    SET result = fn_on / (fy_on + fn_on);
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcFAR |
CREATE FUNCTION calcFAR (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF (fy_oy + fy_on) = 0 THEN RETURN 'NA'; END IF;
    SET result = fy_on / (fy_oy + fy_on);
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcCSI |
CREATE FUNCTION calcCSI (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF (fy_oy + fy_on + fn_oy) = 0 THEN RETURN 'NA'; END IF;
    SET result = fy_oy / (fy_oy + fy_on + fn_oy);
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcGSS |
CREATE FUNCTION calcGSS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE c DECIMAL(12,6);
    DECLARE result DECIMAL(12,6);
    IF total = 0 THEN RETURN 'NA'; END IF;
    SET c = ( (fy_oy + fy_on) / total ) * (fy_oy + fn_oy);
    SET result = (fy_oy - c) / (fy_oy + fy_on + fn_oy - c);
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcHK |
CREATE FUNCTION calcHK (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE result DECIMAL(12,6);
    IF ( (fy_oy + fn_oy) = 0 OR (fy_on + fn_on) = 0 ) THEN RETURN 'NA'; END IF;
    SET result = (fy_oy / (fy_oy + fn_oy)) - (fy_on / (fy_on + fn_on));
    RETURN IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcHSS |
CREATE FUNCTION calcHSS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE c DECIMAL(12,6);
    DECLARE result DECIMAL(12,6);
    IF total = 0 THEN RETURN 'NA'; END IF;
    SET c = ( (fy_oy + fy_on)*(fy_oy + fn_oy) + (fn_oy + fn_on)*(fy_on + fn_on) ) / total;
    SET result = (fy_oy + fn_on - c) / (total - c);
    RETURN  IFNULL( result , 'NA');
END |

DROP FUNCTION IF EXISTS calcODDS |
CREATE FUNCTION calcODDS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE pody DECIMAL(12,6);
    DECLARE pofd DECIMAL(12,6);
    DECLARE result DECIMAL(12,6);
    IF ( (fy_oy + fn_oy) = 0 OR (fy_on + fn_on) = 0 ) THEN RETURN 'NA'; END IF;
    SET pody = fy_oy / (fy_oy + fn_oy);
    SET pofd = fy_on / (fy_on + fn_on);
    IF ( pody = 0 OR pofd = 0 ) THEN RETURN 'NA'; END IF;
    SET result = (pody * (1-pofd)) / (pofd * (1-pody));
    RETURN  IFNULL(result , 'NA');
END |

DROP FUNCTION IF EXISTS calcME2 |
CREATE FUNCTION calcME2 (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
  DECLARE me DECIMAL(12,6);
  DECLARE result DECIMAL(12,6);
  SET me = calcME(total , fbar , obar , fobar , ffbar , oobar );
  SET result = (me * me);
RETURN  IFNULL(result, 'NA'); END |

DROP FUNCTION IF EXISTS calcMSESS |
CREATE FUNCTION calcMSESS (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE ostdev DECIMAL(12,6);
    DECLARE mse DECIMAL(12,6);
    DECLARE result DECIMAL(12,6);
    SET ostdev=calcOSTDEV(total , fbar , obar , fobar , ffbar , oobar );
    SET mse=calcMSE(total , fbar , obar , fobar , ffbar , oobar );
    SET result = (1.0 - mse/(ostdev*ostdev) );
RETURN IFNULL( result ,'NA'); END |

DROP FUNCTION IF EXISTS calcANOM_CORR |
CREATE FUNCTION calcANOM_CORR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE v DECIMAL(12,6);
    DECLARE anom_corr DECIMAL(12,6);
    SET v = (POW(total,2) * ffbar - POW(total,2) * POW(fbar,2)) * (POW(total,2) * oobar - POW(total,2) * POW(obar,2));
    IF 0 >= v THEN RETURN 'NA'; END IF;
    
    SET anom_corr = (POW(total,2) * fobar - POW(total,2) * fbar * obar) / SQRT(v);
    IF 1 < anom_corr THEN RETURN 'NA'; END IF;
    RETURN IFNULL(anom_corr, 'NA');
END |

--
--  Vl1l2 stat calculations
--


DROP FUNCTION IF EXISTS calcVL1L2_FBAR |
CREATE FUNCTION calcVL1L2_FBAR(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL, uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        IF 0 = uvffbar THEN RETURN 'NA'; END IF;
        SET result = SQRT(uvffbar);
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_OBAR |

CREATE FUNCTION calcVL1L2_OBAR(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL, uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        IF 0 = uvffbar THEN RETURN 'NA'; END IF;
        SET result = SQRT(uvoobar);
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_ME |
CREATE FUNCTION calcVL1L2_ME(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL, uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result = SQRT(POW(ufbar, 2) - 2 * ufbar * uobar + POW(uobar, 2) + POW(vfbar, 2) - 2 * vfbar * vobar + POW(vobar, 2));
        RETURN IFNULL(result, 'NA');
    END |


DROP FUNCTION IF EXISTS calcVL1L2_BIAS |
CREATE FUNCTION calcVL1L2_BIAS(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result = SQRT(uvffbar) - SQRT(uvoobar);
        RETURN IFNULL(result, 'NA');
    END |


DROP FUNCTION IF EXISTS calcVL1L2_MSE |
CREATE FUNCTION calcVL1L2_MSE(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result = uvffbar -2 * uvfobar + uvoobar;
        if result < 0 THEN RETURN 'NA'; END IF;
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_RMSE |
CREATE FUNCTION calcVL1L2_RMSE(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result = SQRT( calcVL1L2_MSE(total , ufbar , vfbar , uobar , vobar , uvfobar , uvffbar ,uvoobar ) );
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_MAE |
CREATE FUNCTION calcVL1L2_MAE(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =  SQRT(POW(ufbar, 2) -2 * ufbar * uobar + POW(uobar, 2) + POW(vfbar, 2) - 2 * vfbar * vobar + POW(vobar, 2));
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_FVAR |
CREATE FUNCTION calcVL1L2_FVAR(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =  total * (uvffbar - POW(ufbar, 2) - POW(vfbar, 2)) / total;
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_OVAR |
CREATE FUNCTION calcVL1L2_OVAR(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =  total *( uvoobar - POW(uobar, 2) - POW(vobar, 2) )/ total;
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_FSTDEV |
CREATE FUNCTION calcVL1L2_FSTDEV(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =  SQRT( calcVL1L2_FVAR (total , ufbar , vfbar , uobar , vobar , uvfobar , uvffbar , uvoobar));
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_OSTDEV |
CREATE FUNCTION calcVL1L2_OSTDEV(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =  SQRT( calcVL1L2_OVAR (total , ufbar , vfbar , uobar , vobar , uvfobar , uvffbar , uvoobar));
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_FOSTDEV |
CREATE FUNCTION calcVL1L2_FOSTDEV(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =  SQRT( total * (uvffbar - POW(ufbar, 2) +uvoobar-POW(uobar, 2)-POW(vobar, 2) -2*(uvfobar-ufbar*uobar - vfbar*vobar))/total);
        RETURN IFNULL(result, 'NA');
    END |


DROP FUNCTION IF EXISTS calcVL1L2_COV |
CREATE FUNCTION calcVL1L2_COV(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =   total * (uvfobar -ufbar*uobar - vfbar * vobar) / (total-0.);
        RETURN IFNULL(result, 'NA');
    END |

DROP FUNCTION IF EXISTS calcVL1L2_CORR |
CREATE FUNCTION calcVL1L2_CORR(total INT, ufbar REAL, vfbar REAL, uobar REAL, vobar REAL, uvfobar REAL, uvffbar REAL,
    uvoobar REAL) RETURNS CHAR(16) DETERMINISTIC
    BEGIN
        DECLARE result DECIMAL(12, 6);
        SET result =   (total * (uvfobar - ufbar * uobar - vfbar * vobar) / total) /
                       (SQRT(total*(uvffbar-ufbar*ufbar-vfbar*vfbar)/total) *
            SQRT( total*(uvoobar-uobar*uobar-vobar*vobar)/total));
        RETURN IFNULL(result, 'NA');
    END |


DELIMITER ;

