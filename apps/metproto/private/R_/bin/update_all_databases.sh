#!/bin/bash
#
# trap handler: print location of last error and process it further
#
function my_trap_handler()
{
        MYSELF="$0"               # equals to my script name
        LASTLINE="$1"            # argument 1: last line of error occurence
        LASTERR="$2"             # argument 2: error code of last command
        printf "\n${MYSELF}: line ${LASTLINE}: exit status of last command: ${LASTERR}"

        # do additional processing: send email or SNMP trap, write result to database, etc.
}
#
# trap commands with non-zero exit code
#
trap 'my_trap_handler ${LINENO} $?' ERR


MAIN_START=$(date +%s.%N)
mysql -umvuser -pmvuser -e 'show databases;' | {
	while read db_name ; do
		if [ "$db_name" != "information_schema" -a  "$db_name" != "Database" -a  "$db_name" != "performance_schema"  -a  "$db_name" != "mysql" -a  "$db_name" != "nhc_display" -a  "$db_name" != "nhc_display_fdeck_training" ];
		then
		  printf '\n\nAbout to update  database: '$db_name

          mysql -umvuser -pmvuser $db_name < update_for_1_9.sql
          if [ $? -gt 0 ];
          then
            #error detected during the update
            printf '\n'$db_name' was NOT UPDATED'
          else
            #successful update
            printf '\n'$db_name' was updated'
          fi


    fi
	done
}


MAIN_END=$(date +%s.%N)
MAIN_DIFF=$(echo "$MAIN_END - $MAIN_START" | bc)
printf '\n\nUpdate : '$MAIN_DIFF'seconds'
