import Logger from "bunyan";
import { FetchOptions } from "imap";
import { ImapSimple, connect, Message, getParts } from "imap-simple";

export interface BankinEmail{
    received: Date,
    html: string
}

export class imapMailbox{

    constructor(
        private logger: Logger,
        private host = process.env["IMAP_HOST"] || "",
        private port = parseInt(process.env["IMAP_PORT"] || "0"),
        private user = process.env["IMAP_USERNAME"] || "",
        private password = process.env["IMAP_PASSWORD"] || "",
        private tls = (parseInt(process.env["IMAP_TLS"] || "") > 0)
    ){
        this.logger.trace("IMAP Parameters", "host", this.host);
        this.logger.trace("IMAP Parameters", "port", this.port);
        this.logger.trace("IMAP Parameters", "user", this.user);
        this.logger.trace("IMAP Parameters", "password", this.password);
        this.logger.trace("IMAP Parameters", "tls", this.tls);

    }

    private async connectToMailbox() : Promise<ImapSimple>{
        const connectionInfos : string[] = [this.user];
        if(process.env["NODE_ENV"] === "development") connectionInfos.push(this.password);

        this.logger.info("Connecting to IMAP", [connectionInfos.join(":"), [this.host, this.port].join(":")].join("@"));
        
        return await connect({
            imap: {
                host: this.host,
                port: this.port,
                user: this.user,
                password: this.password,
                tls: this.tls
            }
        });
    }

    public async getLastBankinEmails(since: Date, fromEmail = "ne-pas-repondre@bankin.com"): Promise<BankinEmail[]>{
        
        const connection = await this.connectToMailbox();
        const output : BankinEmail[] = [];

        await connection.openBox("INBOX");
        const shiftedSince = new Date(since.valueOf() + 24*3600000);

        this.logger.info("Looking for emails received from", fromEmail, "since", shiftedSince);


        const searchCriteria = [['SENTSINCE', shiftedSince.toISOString()],['FROM', fromEmail]];
        const fetchOptions : FetchOptions = {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true,
            markSeen: false
        }

        const results: Message[] = await connection.search(searchCriteria, fetchOptions);

        await Promise.allSettled(results.map(async (mail: Message) => {
            const headers = mail.parts.filter(part => part.which.match(/^HEADER/)).map(part => part.body);
            let received : Date = since;
            
            if(headers.length > 0){
                if(headers[0].date !== undefined && Array.isArray(headers[0].date) && headers[0].date.length > 0){
                    received = new Date(headers[0].date[0]);
                } 
            }
            if(mail.attributes.struct === undefined){
                this.logger.warn("Email has no struct", mail.attributes);
                return;
            }

            const html = await Promise.all((await getParts(mail.attributes.struct))
                .filter(part => part.type.toLowerCase() === 'text' && part.subtype.toLowerCase() === 'html')
                .map(async part => await connection.getPartData(mail, part) as string));

            this.logger.trace("New email found @", received);

            output.push({
                html: html[0],
                received: received
            })
        }));

        await connection.closeBox(false);
        await connection.end();

        this.logger.debug("Found", output.length, "emails");
        output.sort((a, b) => a.received.valueOf() - b.received.valueOf());
        return output;
    }

}
