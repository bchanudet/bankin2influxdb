import { createLogger, LoggerOptions } from "bunyan";
import { BankinEmail, imapMailbox } from "./imap";
import { influx } from "./influxdb";
import { emailParser } from "./parser";

const INTERVAL = 3600; // in seconds

const loggerOptions : LoggerOptions = {
    name: "bankin2influxdb",
    streams: [
        {
          level: process.env["NODE_ENV"] === "development" ? 'trace' : 'info',
          stream: process.stdout           
        }
    ]
}

const logger = createLogger(loggerOptions);

const main = async () => {
    const imap = new imapMailbox(logger);
    const parser = new emailParser(logger);
    const inflxdb = new influx(logger);

    let mails: BankinEmail[] = [];

    try {
        const lastWrite = await inflxdb.getLastWriteDate();
        mails = await imap.getLastBankinEmails(lastWrite);
    } catch (error) {
        logger.error("ERROR", error);
    }

    mails.forEach(mail => {
        const banks = parser.parseHtml(mail.html);
        banks.forEach(bank => {
            bank.accounts.forEach(account => {
                inflxdb.addAccountBalance(bank.name, account.name, account.balance, mail.received);
            })
        })
    })

    try {
        await inflxdb.send();
        logger.info("Finished for now");
    } catch (error) {
        logger.error("Error caught: ", error);
    }
}

(async () => {
    await main();
    setInterval(main, INTERVAL*1000);
})()
