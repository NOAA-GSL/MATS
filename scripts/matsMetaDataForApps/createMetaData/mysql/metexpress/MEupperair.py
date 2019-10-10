#!/usr/bin/env python3
"""
This script creates the metadata tables required for a METexpress upper air app. It parses the required fields from any
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

class MEUpperair(MEMetadata):
    def __init__(self, options):
        options['needsTrshs'] = False  # upperair does not have thresholds
        options['fcstWhereClause'] = 'fcst_lev like "P%"'
        super().__init__(options)

    def strip_level(self, elem):
        # helper function for sorting levels
        if '-' not in elem:
            return int(elem[1:])
        else:
            hyphen_idx = elem.find('-')
            return int(elem[1:hyphen_idx])



if __name__ == '__main__':
    options = MEMetadata.get_options(sys.argv)
    options['name'] = __name__
    options['line_data_table'] = ["line_data_sl1l2"]
    options['metadata_table'] = "upperair_mats_metadata"
    options['app_reference'] = "met-upperair"
    options['string_fields'] = ["regions", "levels", "fcst_lens", "variables", "fcst_orig"]
    options['int_fields'] = ["mindate", "maxdate", "numrecs", "updated"]
    options['database_groups'] = "upperair_database_groups"
    start = str(datetime.now())
    print('UPPER AIR MATS FOR MET METADATA START: ' + start)
    me_dbcreator = MEUpperair(options)
    me_dbcreator.main()
    print('UPPER AIR MATS FOR MET METADATA END: ' + str(datetime.now()) + " started at: " + start)
    sys.exit(0)
