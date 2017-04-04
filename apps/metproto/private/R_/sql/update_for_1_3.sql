DELIMITER |

--
--  Sl1l2 stat calculations
--

DROP FUNCTION IF EXISTS calcStdDev |
CREATE FUNCTION calcStdDev (vsum REAL, vsum_sq REAL, n INT) RETURNS REAL DETERMINISTIC
BEGIN
    DECLARE v REAL;
    IF 1 > n THEN RETURN -1; END IF;
    SET v = (vsum_sq - vsum*vsum/n)/(n - 1);
    IF 0 > v THEN RETURN -1; END IF;
    RETURN SQRT(v);
END |

DROP FUNCTION IF EXISTS calcFBAR |
CREATE FUNCTION calcFBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  fbar; END |

DROP FUNCTION IF EXISTS calcOBAR |
CREATE FUNCTION calcOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  obar; END |

DROP FUNCTION IF EXISTS calcFSTDEV |
CREATE FUNCTION calcFSTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN calcStdDev(fbar * total, ffbar * total, total); END |

DROP FUNCTION IF EXISTS calcOSTDEV |
CREATE FUNCTION calcOSTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN calcStdDev(obar * total, oobar * total, total); END |

DROP FUNCTION IF EXISTS calcFOBAR |
CREATE FUNCTION calcFOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  fobar; END |

DROP FUNCTION IF EXISTS calcFFBAR |
CREATE FUNCTION calcFFBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN ffbar; END |

DROP FUNCTION IF EXISTS calcOOBAR |
CREATE FUNCTION calcOOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN oobar; END |

DROP FUNCTION IF EXISTS calcMBIAS |
CREATE FUNCTION calcMBIAS (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF 0 = obar THEN RETURN 'NA'; END IF; RETURN (fbar / obar); END |

DROP FUNCTION IF EXISTS calcPR_CORR |
CREATE FUNCTION calcPR_CORR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE v REAL;
    DECLARE pr_corr REAL;
    SET v = (POW(total,2) * ffbar - POW(total,2) * POW(fbar,2)) * (POW(total,2) * oobar - POW(total,2) * POW(obar,2));
    IF 0 >= v THEN RETURN 'NA'; END IF;
    SET pr_corr = (POW(total,2) * fobar - POW(total,2) * fbar * obar) / SQRT(v);
    IF 1 < pr_corr THEN RETURN 'NA'; END IF;
    RETURN pr_corr;
END |

DROP FUNCTION IF EXISTS calcME |
CREATE FUNCTION calcME (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  (fbar - obar); END |

DROP FUNCTION IF EXISTS calcMSE |
CREATE FUNCTION calcMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  (ffbar + oobar - 2*fobar); END |

DROP FUNCTION IF EXISTS calcRMSE |
CREATE FUNCTION calcRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN SQRT(ffbar + oobar - 2*fobar); END |

DROP FUNCTION IF EXISTS calcESTDEV |
CREATE FUNCTION calcESTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  calcStdDev( (fbar - obar)*total, (ffbar + oobar - 2*fobar)*total, total ); END |

DROP FUNCTION IF EXISTS calcBCMSE |
CREATE FUNCTION calcBCMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  (ffbar + oobar - 2*fobar) - POW(fbar - obar, 2); END |

DROP FUNCTION IF EXISTS calcBCRMSE |
CREATE FUNCTION calcBCRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN RETURN  SQRT((ffbar + oobar - 2*fobar) - POW(fbar - obar, 2)); END |

DROP FUNCTION IF EXISTS calcMAE |
CREATE FUNCTION calcMAE ( mae REAL) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF mae = -9999 THEN RETURN 'NA'; END IF; RETURN  mae; END |
--
-- CTC stat calculations
--

DROP FUNCTION IF EXISTS calcBASER |
CREATE FUNCTION calcBASER (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF total = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT((fy_oy + fn_oy) / total, 4); END |

DROP FUNCTION IF EXISTS calcACC |
CREATE FUNCTION calcACC (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF total = 0 THEN RETURN 'NA'; END IF; RETURN (fy_oy + fn_on) / total; END |

DROP FUNCTION IF EXISTS calcFBIAS |
CREATE FUNCTION calcFBIAS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF (fy_oy + fn_oy) = 0 THEN RETURN 'NA'; END IF; RETURN (fy_oy + fy_on) / (fy_oy + fn_oy); END |

DROP FUNCTION IF EXISTS calcPODY |
CREATE FUNCTION calcPODY (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF (fy_oy + fn_oy) = 0 THEN RETURN 'NA'; END IF; RETURN fy_oy / (fy_oy + fn_oy); END |

DROP FUNCTION IF EXISTS calcPOFD |
CREATE FUNCTION calcPOFD (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF (fy_on + fn_on) = 0 THEN RETURN 'NA'; END IF; RETURN fy_on / (fy_on + fn_on); END |

DROP FUNCTION IF EXISTS calcPODN |
CREATE FUNCTION calcPODN (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF (fy_on + fn_on) = 0 THEN RETURN 'NA'; END IF; RETURN fn_on / (fy_on + fn_on); END |

DROP FUNCTION IF EXISTS calcFAR |
CREATE FUNCTION calcFAR (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF (fy_oy + fy_on) = 0 THEN RETURN 'NA'; END IF; RETURN fy_on / (fy_oy + fy_on); END |

DROP FUNCTION IF EXISTS calcCSI |
CREATE FUNCTION calcCSI (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN IF (fy_oy + fy_on + fn_oy) = 0 THEN RETURN 'NA'; END IF; RETURN fy_oy / (fy_oy + fy_on + fn_oy); END |

DROP FUNCTION IF EXISTS calcGSS |
CREATE FUNCTION calcGSS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE c REAL;
    IF total = 0 THEN RETURN 'NA'; END IF;
    SET c = ( (fy_oy + fy_on) / total ) * (fy_oy + fn_oy);
    RETURN  (fy_oy - c) / (fy_oy + fy_on + fn_oy - c);
END |

DROP FUNCTION IF EXISTS calcHK |
CREATE FUNCTION calcHK (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    IF ( (fy_oy + fn_oy) = 0 OR (fy_on + fn_on) = 0 ) THEN RETURN 'NA'; END IF;
    RETURN  (fy_oy / (fy_oy + fn_oy)) - (fy_on / (fy_on + fn_on));
END |

DROP FUNCTION IF EXISTS calcHSS |
CREATE FUNCTION calcHSS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE c REAL;
    IF total = 0 THEN RETURN 'NA'; END IF;
    SET c = ( (fy_oy + fy_on)*(fy_oy + fn_oy) + (fn_oy + fn_on)*(fy_on + fn_on) ) / total;
    RETURN (fy_oy + fn_on - c) / (total - c);
END |

DROP FUNCTION IF EXISTS calcODDS |
CREATE FUNCTION calcODDS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) DETERMINISTIC
BEGIN
    DECLARE pody REAL;
    DECLARE pofd REAL;
    IF ( (fy_oy + fn_oy) = 0 OR (fy_on + fn_on) = 0 ) THEN RETURN 'NA'; END IF;
    SET pody = fy_oy / (fy_oy + fn_oy);
    SET pofd = fy_on / (fy_on + fn_on);
    IF ( pody = 0 OR pofd = 0 ) THEN RETURN 'NA'; END IF;
    RETURN  (pody * (1-pofd)) / (pofd * (1-pody));
END |


DELIMITER ;


