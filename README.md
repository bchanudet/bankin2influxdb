# bankin2influxdb

Fetch the balances of your accounts from the daily summary email and inserts the data into an InfluxDB bucket.

## Configuration

All configuration is done via Environment variables

```.env
# IMAP CONFIGURATION
# IMAP Host, Port, and TLS toggle
IMAP_HOST="imap.yourmailprovider.com"
IMAP_PORT=993
IMAP_TLS=1
# IMAP Authentication
# <!> Doesn't support O2Auth flows
IMAP_USERNAME="your.address@yourmailprovider.com"
IMAP_PASSWORD="password123"

# INFLUXDB CONFIGURATION
# URL of the InfluxDB server
INFLUXDB_URL="http://localhost:8086"
# InfluxDB API Token
# The token should have a write and read on the bucket.
# The read permission is used to detect the last time we fetch the data from IMAP.
INFLUXDB_TOKEN="token"
# InfluxDB organization
INFLUXDB_ORG=""
# InfluxDB bucket
INFLUXDB_BUCKET="financial"
```

