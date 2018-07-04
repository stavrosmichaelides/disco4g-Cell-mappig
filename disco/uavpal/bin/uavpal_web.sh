#!/bin/sh
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/data/ftp/uavpal/lib
curl=/data/ftp/uavpal/bin/curl 

#TODO: handle stick mode

hilinkserver="$(ifconfig eth1 | awk -F: '/inet addr/ {print $2}' | cut -d' ' -f1 | cut -d '.' -f 1,2,3).1"
sessionId=$($curl -q -s -D - -o /dev/null http://${hilinkserver}/html/home.html | grep Set-Cookie: | cut -d ':' -f 2 | cut -d ';' -f 1)

function getTagValue {
   xml=$1
   tag=$2
   retval=$(echo "${xml}" | awk -F'[<>]' "/${tag}/"'{print $3;}')
   echo $retval
}

function modemSignal() 
{
  status=$(getTagValue "$($curl -q -s -b $sessionId "http://${hilinkserver}/api/monitoring/status" | sed 's/[^[:print:]\t]//g')" "SignalIcon")
  signal=$($curl -q -s -b $sessionId "http://${hilinkserver}/api/device/signal" | sed 's/[^[:print:]\t]//g')

  rsrq=$(getTagValue "$signal" "rsrq")
  rsrp=$(getTagValue "$signal" "rsrp")
  rssi=$(getTagValue "$signal" "rssi")
  sinr=$(getTagValue "$signal" "sinr")
  cellid=$(getTagValue "$signal" "cell_id")

  echo "$status $rsrq $rsrp $rssi $sinr $cellid"
}

while true
do
	# I think `cat /tmp/gps_nmea_out` was delayed by waiting for buffer to flush
	# after many tries, this seems to be the fastest way to get data from /tmp/gps_nmea_out
	gps=$(grep -m 1 GNRMC /tmp/gps_nmea_out | awk '/GNRMC/ {gsub(/[^[:print:]\t]/,"",$0); gsub(/^.*GNRMC,/,"$GNRMC,",$0); print}')
	lte=$(modemSignal)
	echo "$gps LTE:$lte"

	# settled on sleep for 1 second in live environment. Don't know how bandwidth and latency is affected if the sleep interval is shorter
	usleep 1000000
done
