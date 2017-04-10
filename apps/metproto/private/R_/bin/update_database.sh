#!/bin/bash
#
# trap handler: print location of last error and process it further
#
function my_trap_handler()
{
        MYSELF="$0"               # equals to my script name
        database="$1"               # equals to my script name
        LASTLINE="$2"            # argument 1: last line of error occurence
        LASTERR="$3"             # argument 2: error code of last command
        printf "\n${MYSELF}: line ${LASTLINE}: exit status of last command: ${LASTERR}"

        # do additional processing: send email or SNMP trap, write result to database, etc.
}
#
# trap commands with non-zero exit code
#
trap 'my_trap_handler ${LINENO} $?' ERR


MAIN_START=$(date +%s.%N)
		  printf '\n\nAbout to update  database: '$db_name

          mysql -umvuser -pmvuser mv_ncep_meso < ../sql/fix_dates_in_vsdb_load.sql
          if [ $? -gt 0 ];
          then
            #error detected during the update
            printf '\n'$db_name' was NOT UPDATED'
          else
            #successful update
            printf '\n'$db_name' was updated'

fi



MAIN_END=$(date +%s.%N)
MAIN_DIFF=$(echo "$MAIN_END - $MAIN_START" | bc)
printf '\n\nUpdate : '$MAIN_DIFF'seconds'
