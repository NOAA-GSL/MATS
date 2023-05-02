SELECT DISTINCT fcstValidEpoch
FROM
    `vxdata`._default.METAR
WHERE
    type = "DD"
    AND docType = "obs"
    AND version = "V01"
    AND fcstValidEpoch BETWEEN 1662249600
    AND 1664841600
    ORDER BY fcstValidEpoch