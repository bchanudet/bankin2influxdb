import { InfluxDB, Point, QueryApi, WriteApi } from "@influxdata/influxdb-client";
import Logger from "bunyan";

export class influx{

    private client: InfluxDB;
    private balances: Point[] = [];

    constructor(
        private logger: Logger,
        private url: string = process.env["INFLUXDB_URL"] || "",
        private token = process.env["INFLUXDB_TOKEN"] || "",
        private org = process.env["INFLUXDB_ORG"] || "",
        private bucket = process.env["INFLUXDB_BUCKET"] || ""
    ){

        this.logger.trace("InfluxDB Parameters", "url", this.url);
        this.logger.trace("InfluxDB Parameters", "token", this.token);
        this.logger.trace("InfluxDB Parameters", "org", this.org);
        this.logger.trace("InfluxDB Parameters", "bucket", this.bucket);

        this.client = new InfluxDB({
            url: this.url,
            token: this.token
        })
    }

    public async getLastWriteDate(): Promise<Date>{
        const querier : QueryApi = this.client.getQueryApi(this.org);
        const query = `
            from(bucket: "${this.bucket}")
            |> range(start: -30d, stop: now())
            |> filter(fn: (r) => r["_measurement"] == "balances")
            |> filter(fn: (r) => r["_field"] == "balance")
            |> group(columns: ["_measurement"], mode:"by")
            |> last()
            |> yield(name: "last")`;

        try {
            const results = await querier.collectRows<{_time: string}>(query);
    
            if(results.length > 0){
                this.logger.trace("Last write date found", new Date(results[0]._time));
                return new Date(results[0]._time);
            }
        } catch (error) {
            this.logger.warn("Error while querying InfluxDB", error);
        }
        
        this.logger.trace("No data found, returning default value", new Date("2021-01-01T00:00:00Z"));
        return new Date("2021-01-01T00:00:00Z");
    }

    public addAccountBalance(bank: string, account: string, balance: number, when: Date){
        const point = new Point("balances")
            .timestamp(when)
            .tag("account", account)
            .tag("bank", bank)
            .intField("balance", balance)
        ;

        this.logger.debug("Creating new point", when, bank, account);
        this.balances.push(point);
    }

    public async send(){
        const writer: WriteApi = this.client.getWriteApi(this.org, this.bucket);
        if(this.balances.length > 0){
            this.logger.debug("Sending", this.balances.length, "points");
            this.balances.forEach((b) => { this.logger.trace("Point", b); });

            writer.writePoints(this.balances);
        }
        return writer.close();
    }
}
