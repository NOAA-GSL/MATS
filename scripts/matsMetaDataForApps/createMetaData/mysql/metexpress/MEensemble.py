#!/usr/bin/env python3
"""
This script creates the metadata tables required for a METexpress ensemble app. It parses the required fields from any
databases that begin with 'mv_' in a mysql instance.

Usage: ["(c)nf_file=", "[(m)ats_metadata_database_name]",
                 "[(D)ata_table_stat_header_id_limit - default is 10,000,000,000]",
                 "[(d)atabase name]" "(u)=metexpress_base_url"]
        cnf_file = None

Author: Molly B Smith, heavily modified by Randy Pierce
"""

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.

from __future__ import print_function
import sys
from datetime import datetime
from metexpress.MEmetadata import MEMetadata

class MEEnsemble(MEMetadata):
    def __init__(self, options):
        options['needsTrshs'] = False  # ensemble does not have thresholds
        options['fcstWhereClause'] = ''
        super().__init__(options)

    def strip_level(self, elem):
        # helper function for sorting levels
        if elem[0] in ['P', 'Z', 'H', 'L', 'A']:
            if '-' not in elem:
                try:
                    return int(elem[1:])
                except ValueError:
                    return 0
            else:
                hyphen_idx = elem.find('-')
                try:
                    return int(elem[1:hyphen_idx])
                except ValueError:
                    return 0
        else:
            try:
                return int(float(elem) + 10000)
            except ValueError:
                return 0


if __name__ == '__main__':
    options = MEMetadata.get_options(sys.argv)
    options['name'] = __name__
    options['line_data_table'] = ["line_data_pct", "line_data_ecnt", "line_data_cnt", "line_data_pstd"]
    options['metadata_table'] = "ensemble_mats_metadata"
    options['app_reference'] = "met-ensemble"
    options['string_fields'] = ["regions", "levels", "fcst_lens", "variables", "fcst_orig"]
    options['int_fields'] = ["mindate", "maxdate", "numrecs", "updated"]
    options['database_groups'] = "ensemble_database_groups"
    start = str(datetime.now())
    print('ENSEMBLE MATS FOR MET METADATA START: ' + start)
    me_dbcreator = MEEnsemble(options)
    me_dbcreator.main()
    print('ENSEMBLE MATS FOR MET METADATA END: ' + str(datetime.now()) + " started at: " + start)
    sys.exit(0)
